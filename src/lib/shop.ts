// Pure rules for the gift shop (/gift + Sale). Shared by the public routes, the order
// page and the tests. The database repeats the same checks atomically when an order is
// placed (shop_place_order); this module is what lets the page say "sold out" early.

export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  maxPerPerson: number;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type CartLine = { id: string; qty: number };

export type CartProblem = { id: string; name: string; reason: "gone" | "stock" | "limit"; available: number };

export type CartCheck = {
  ok: boolean;
  total: number;
  lines: { id: string; name: string; price: number; qty: number }[];
  problems: CartProblem[];
};

// `already` = what this phone number has ordered before (not cancelled), per product id.
export function checkCart(products: ShopProduct[], cart: CartLine[], already: Record<string, number> = {}): CartCheck {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartCheck["lines"] = [];
  const problems: CartProblem[] = [];
  let total = 0;
  for (const c of cart) {
    const qty = Math.floor(Number(c.qty));
    if (!(qty >= 1)) continue;
    const p = byId.get(c.id);
    if (!p || !p.active) {
      problems.push({ id: c.id, name: p?.name ?? "สินค้านี้", reason: "gone", available: 0 });
      continue;
    }
    if (p.stock < qty) {
      problems.push({ id: p.id, name: p.name, reason: "stock", available: Math.max(0, p.stock) });
      continue;
    }
    const left = p.maxPerPerson - (already[p.id] ?? 0);
    if (qty > left) {
      problems.push({ id: p.id, name: p.name, reason: "limit", available: Math.max(0, left) });
      continue;
    }
    lines.push({ id: p.id, name: p.name, price: p.price, qty });
    total += p.price * qty;
  }
  return { ok: problems.length === 0 && lines.length > 0, total, lines, problems };
}

export function problemText(p: CartProblem): string {
  if (p.reason === "gone") return `${p.name} ไม่มีขายแล้ว`;
  if (p.reason === "stock") return p.available > 0 ? `${p.name} เหลือแค่ ${p.available} ชิ้น` : `${p.name} หมดแล้ว`;
  return p.available > 0 ? `${p.name} สั่งได้อีกแค่ ${p.available} ชิ้น (จำกัดคนละ ${p.available} ชิ้นที่เหลือ)` : `${p.name} คุณสั่งครบจำนวนที่จำกัดแล้ว`;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export const validPhone = (p: string) => /^0\d{8,9}$/.test(p);

// 8 chars, no look-alikes (0/O, 1/I): easy to read out and hard to guess (~40 bits).
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newOrderCode(random: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_CHARS[random(CODE_CHARS.length)];
  return `G-${s}`;
}

export function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, "0")}${value}`;

// Thai PromPay QR payload (EMVCo). `id` is a mobile number (10 digits) or national / tax id (13 digits).
export function promptPayPayload(id: string, amount?: number): string | null {
  const digits = id.replace(/\D/g, "");
  let target: string;
  if (digits.length === 10 && digits.startsWith("0")) target = tlv("01", `0066${digits.slice(1)}`);
  else if (digits.length === 13) target = tlv("02", digits);
  else return null;
  const dynamic = typeof amount === "number" && amount > 0;
  const body =
    tlv("00", "01") +
    tlv("01", dynamic ? "12" : "11") +
    tlv("29", tlv("00", "A000000677010111") + target) +
    tlv("58", "TH") +
    tlv("53", "764") +
    (dynamic ? tlv("54", amount.toFixed(2)) : "") +
    "6304";
  return body + crc16(body);
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  paid_pending: "รอตรวจสลิป",
  confirmed: "ยืนยันแล้ว",
  shipped: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};

// validate the cart a visitor sends (untrusted input)
export function parseCart(raw: unknown): CartLine[] | null {
  if (!Array.isArray(raw) || raw.length > 50) return null;
  const out: CartLine[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const { id, qty } = r as { id?: unknown; qty?: unknown };
    if (typeof id !== "string" || id.length > 64 || typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) return null;
    out.push({ id, qty });
  }
  return out;
}


// Orders with exactly the same items (same products, same quantities) go in one group, so a
// whole batch can be packed in one go. Biggest group first.
export type OrderGroup = { key: string; label: string; orders: number; pieces: number; ids: string[] };
export function groupOrders(orders: { id: string; items: { name: string; qty: number }[] }[]): OrderGroup[] {
  const m = new Map<string, OrderGroup>();
  for (const o of orders) {
    const lines = [...o.items].sort((a, b) => a.name.localeCompare(b.name, "th"));
    const key = lines.map((l) => `${l.name}×${l.qty}`).join("|");
    const pieces = lines.reduce((n, l) => n + l.qty, 0);
    const g = m.get(key) ?? { key, label: lines.map((l) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name)).join(" + "), orders: 0, pieces: 0, ids: [] };
    g.orders += 1;
    g.pieces += pieces;
    g.ids.push(o.id);
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => b.orders - a.orders || a.label.localeCompare(b.label, "th"));
}
