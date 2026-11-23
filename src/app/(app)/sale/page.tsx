"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, ImagePlus, Pencil, Plus, Printer, Receipt, Search, Trash2, X } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { uploadShopImage } from "@/lib/supabase/queries";
import { buildXlsx } from "@/lib/xlsx";
import { saleSheets } from "@/lib/saleExport";
import { ORDER_STATUS_LABEL, groupOrders, type ShopProduct } from "@/lib/shop";
import { cn } from "@/lib/utils";

type Order = {
  id: string; code: string; name: string; phone: string; address: string; note: string; total: number;
  hasSlip: boolean; status: string; createdAt: string; items: { productId: string | null; name: string; price: number; qty: number }[];
};
type Settings = { title: string; intro: string; promptpayId: string; lineNote: string; lineUrl: string; isOpen: boolean };

const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const STATUS_STYLE: Record<string, string> = {
  paid_pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  shipped: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-400",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? `ผิดพลาด (${r.status})`);
  return d as T;
}

export default function SalePage() {
  const [tab, setTab] = useState<"slips" | "orders" | "products" | "settings">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [o, p, s] = await Promise.all([
        api<{ orders: Order[] }>("/api/sale/orders"),
        api<{ products: ShopProduct[] }>("/api/sale/products"),
        api<Settings>("/api/sale/settings"),
      ]);
      setOrders(o.orders);
      setProducts(p.products);
      setSettings(s);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) return <LoadingView />;
  const pending = orders.filter((o) => o.status === "paid_pending").length;

  return (
    <div className="flex-1">
      <Topbar title="Sale" subtitle="ขายของ · ออเดอร์จากหน้า /gift" />
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 text-sm">
          {([["slips", `ตรวจสลิป${pending ? ` (${pending})` : ""}`], ["orders", "ออเดอร์"], ["products", "สินค้า"], ["settings", "ตั้งค่า"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("flex-1 rounded-lg py-2 font-medium", tab === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>{l}</button>
          ))}
        </div>
        {tab === "slips" && <SlipReview orders={orders} onChange={reload} />}
        {tab === "orders" && <Orders orders={orders} products={products} onChange={reload} />}
        {tab === "products" && <Products products={products} onChange={reload} />}
        {tab === "settings" && settings && <SettingsForm initial={settings} onSaved={reload} />}
        {tab === "settings" && <StockLinks />}
      </div>
    </div>
  );
}

// Slip check: every order waiting for a check, slip picture first. Compare the amount, tap อนุมัติ.
function SlipReview({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const queue = useMemo(() => orders.filter((o) => o.status === "paid_pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [orders]);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(o: Order, status: "confirmed" | "cancelled") {
    if (status === "cancelled" && !window.confirm(`ไม่อนุมัติ ${o.code} (${o.name})?\nออเดอร์จะถูกยกเลิกและสต็อกคืนเข้าระบบ`)) return;
    setBusy(o.id);
    try {
      await api("/api/sale/orders", { method: "PATCH", body: JSON.stringify({ id: o.id, status }) });
      await onChange();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "ไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  if (queue.length === 0) return <p className="rounded-xl bg-white py-16 text-center text-sm text-gray-400 shadow-sm">ไม่มีสลิปรอตรวจ ✓</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">รอตรวจ {queue.length} ออเดอร์ (เก่าสุดอยู่บน) เทียบยอดในสลิปกับ "ยอดที่ต้องได้" แล้วกดอนุมัติ</p>
      {queue.map((o) => (
        <Card key={o.id} className="overflow-hidden">
          <div className="grid sm:grid-cols-[minmax(0,260px)_1fr]">
            <a href={`/api/sale/orders?slip=${o.id}`} target="_blank" rel="noreferrer" className="flex max-h-[420px] items-start justify-center overflow-hidden bg-gray-100">
              {o.hasSlip ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/sale/orders?slip=${o.id}`} alt={`สลิป ${o.code}`} className="max-h-[420px] w-full object-contain" loading="lazy" />
              ) : (
                <span className="py-20 text-sm text-red-500">ไม่มีสลิปแนบ</span>
              )}
            </a>
            <div className="flex flex-col p-4">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-sm font-semibold">{o.code}</span>
                <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">ยอดที่ต้องได้</p>
              <p className="text-3xl font-bold tabular-nums text-gray-900">{baht(o.total)}</p>
              <p className="mt-2 text-sm font-medium">{o.name} · {o.phone}</p>
              <ul className="mt-1 text-sm text-gray-600">
                {o.items.map((i, k) => <li key={k}>{i.name} × {i.qty}</li>)}
              </ul>
              <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-4">
                <button disabled={busy === o.id} onClick={() => act(o, "confirmed")} className="rounded-xl bg-green-600 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50">{busy === o.id ? "กำลังบันทึก…" : "✓ อนุมัติ"}</button>
                <button disabled={busy === o.id} onClick={() => act(o, "cancelled")} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">ไม่อนุมัติ</button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Orders({ orders, products, onChange }: { orders: Order[]; products: ShopProduct[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Order | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("active");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  // orders in the chosen status filter, grouped by what is in the box
  const inFilter = useMemo(() => orders.filter((o) => (filter === "all" ? true : filter === "active" ? o.status !== "cancelled" : o.status === filter)), [orders, filter]);
  const groups = useMemo(() => groupOrders(inFilter), [inFilter]);
  const groupIds = useMemo(() => (group && groups.find((g) => g.key === group)?.ids) || null, [groups, group]);
  const groupSet = useMemo(() => (groupIds ? new Set(groupIds) : null), [groupIds]);
  const shown = useMemo(() => {
    // search ignores the status filter: you look someone up first, then change their status
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length) {
      return orders.filter((o) => {
        const hay = `${o.code} ${o.name} ${o.phone} ${o.address} ${o.note} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase().replace(/-/g, "");
        return words.every((w) => hay.includes(w.replace(/-/g, "")) || o.phone.includes(w.replace(/\D/g, "") || "\u0000"));
      });
    }
    return inFilter.filter((o) => !groupSet || groupSet.has(o.id));
  }, [orders, q, inFilter, groupSet]);
  const need = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) if (o.status !== "cancelled") for (const i of o.items) m.set(i.name, (m.get(i.name) ?? 0) + i.qty);
    return [...m.entries()];
  }, [orders]);
  // money + customers over every order that is not cancelled (a customer = one phone number)
  const sum = useMemo(() => {
    const live = orders.filter((o) => o.status !== "cancelled");
    const money = (list: Order[]) => list.reduce((n, o) => n + o.total, 0);
    const approved = live.filter((o) => o.status !== "paid_pending");
    const pendingList = live.filter((o) => o.status === "paid_pending");
    return {
      total: money(live),
      approved: money(approved),
      pending: money(pendingList),
      pendingCount: pendingList.length,
      customers: new Set(live.map((o) => o.phone)).size,
      orders: live.length,
      pieces: live.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0),
      cancelled: orders.length - live.length,
    };
  }, [orders]);
  const allPicked = shown.length > 0 && shown.every((o) => picked.has(o.id));

  async function setStatus(o: Order, status: string) {
    if (status === "cancelled" && !window.confirm(`ยกเลิกออเดอร์ ${o.code}? สินค้าจะคืนเข้าสต็อก`)) return;
    try {
      await api("/api/sale/orders", { method: "PATCH", body: JSON.stringify({ id: o.id, status }) });
      onChange();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "ไม่สำเร็จ");
    }
  }
  // Excel with 3 sheets: customers, orders, product lines (everything in Sale, not just what is on screen)
  function exportExcel() {
    const bytes = buildXlsx(saleSheets(orders));
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sale-ลูกค้า-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const printIds = (ids: string[]) => window.open(`/print/sale?ids=${ids.join(",")}`, "_blank");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["ยอดรวมทั้งหมด", baht(sum.total), "ไม่นับที่ยกเลิก", "text-gray-900"],
          ["ตรวจสลิปแล้ว", baht(sum.approved), "ยืนยัน + ส่งแล้ว", "text-green-600"],
          ["รอตรวจสลิป", baht(sum.pending), `${sum.pendingCount} ออเดอร์`, "text-amber-600"],
          ["จำนวนลูกค้า", `${sum.customers} คน`, `${sum.orders} ออเดอร์ · ${sum.pieces} ชิ้น`, "text-gray-900"],
        ] as const).map(([label, value, hint, color]) => (
          <Card key={label} className="p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
            <p className="text-[11px] text-gray-400">{hint}</p>
          </Card>
        ))}
      </div>
      {sum.cancelled > 0 && <p className="text-xs text-gray-400">ยกเลิกแล้ว {sum.cancelled} ออเดอร์ (ไม่รวมในยอดด้านบน)</p>}
      {need.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium text-gray-500">ของที่ต้องเตรียมรวม (ไม่นับที่ยกเลิก)</p>
          <div className="flex flex-wrap gap-2">
            {need.map(([n, q]) => <span key={n} className="rounded-full bg-gray-100 px-3 py-1 text-sm">{n} × <b>{q}</b></span>)}
          </div>
        </Card>
      )}
      {groups.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium text-gray-500">จัดกลุ่มตามชุดสินค้า — {groups.length} แบบ (กดเพื่อดูเฉพาะกลุ่ม ปริ้นและแพ็คทีเดียวได้)</p>
          <div className="space-y-1.5">
            {groups.map((g) => (
              <button key={g.key} onClick={() => { setGroup(group === g.key ? null : g.key); setPicked(new Set()); }} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left", group === g.key ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                <span className="min-w-0 flex-1 text-sm">{g.label}</span>
                <span className="shrink-0 text-right text-sm tabular-nums"><b>{g.orders}</b> ออเดอร์<span className="block text-[11px] text-gray-400">{g.pieces} ชิ้น</span></span>
              </button>
            ))}
          </div>
          {group && <button onClick={() => setGroup(null)} className="mt-2 text-xs font-medium text-brand-600">ล้างตัวกรองกลุ่ม ✕</button>}
        </Card>
      )}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา ชื่อ / เบอร์โทร / รหัสออเดอร์ / ที่อยู่ / สินค้า" className={cn(field, "pl-9 pr-9")} />
        {q && <button onClick={() => setQ("")} aria-label="ล้างคำค้นหา" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100"><X size={15} /></button>}
      </div>
      {q.trim() && <p className="text-xs text-gray-500">พบ {shown.length} ออเดอร์ (ค้นหาจากทุกสถานะ รวมที่ยกเลิก)</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
          <option value="active">ที่ไม่ยกเลิก</option>
          <option value="all">ทั้งหมด</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(shown.map((o) => o.id)))} /> เลือกทั้งหมด
        </label>
        <button disabled={orders.length === 0} onClick={exportExcel} className="ml-auto flex items-center gap-1.5 rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-40">
          <Download size={15} /> Export Excel
        </button>
        <button disabled={picked.size === 0} onClick={() => printIds([...picked])} className=" flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">
          <Printer size={15} /> ปริ้นที่เลือก ({picked.size})
        </button>
        <button disabled={shown.length === 0} onClick={() => printIds(shown.map((o) => o.id))} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-40">
          <Printer size={15} /> ปริ้นทั้งหมดที่แสดง
        </button>
      </div>
      {shown.length === 0 && <p className="py-12 text-center text-sm text-gray-400">{q.trim() ? "ไม่พบออเดอร์ที่ค้นหา" : "ยังไม่มีออเดอร์"}</p>}
      {shown.map((o) => (
        <Card key={o.id} className="p-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={picked.has(o.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{o.code}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[o.status])}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                <span className="text-[11px] text-gray-400">{new Date(o.createdAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              <p className="mt-1 text-sm font-medium">{o.name} · {o.phone}</p>
              <p className="whitespace-pre-line text-xs text-gray-500">{o.address}</p>
              {o.note && <p className="mt-1 text-xs text-amber-700">หมายเหตุ: {o.note}</p>}
              <ul className="mt-2 text-sm">
                {o.items.map((i, k) => <li key={k}>{i.name} × {i.qty} <span className="text-gray-400">({baht(i.price * i.qty)})</span></li>)}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{baht(o.total)}</span>
                {o.hasSlip && <a href={`/api/sale/orders?slip=${o.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline"><Receipt size={13} /> ดูสลิป</a>}
                <select value={o.status} disabled={o.status === "cancelled"} onChange={(e) => setStatus(o, e.target.value)} className="ml-auto rounded-lg border border-gray-200 px-2 py-1 text-xs">
                  {Object.entries(ORDER_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {o.status !== "cancelled" && <button onClick={() => setEditing(o)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="แก้ไขออเดอร์"><Pencil size={14} /></button>}
                <button onClick={() => printIds([o.id])} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="ปริ้น"><Printer size={14} /></button>
              </div>
            </div>
          </div>
        </Card>
      ))}
      {editing && <EditOrder order={editing} products={products} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}
    </div>
  );
}

type Draft = { id?: string; name: string; description: string; price: string; stock: string; maxPerPerson: string; imageUrl: string | null; active: boolean };
const EMPTY: Draft = { name: "", description: "", price: "", stock: "", maxPerPerson: "1", imageUrl: null, active: true };

function Products({ products, onChange }: { products: ShopProduct[]; onChange: () => void }) {
  const [edit, setEdit] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    if (!edit || !edit.name.trim()) return;
    setBusy(true);
    try {
      await api("/api/sale/products", { method: "POST", body: JSON.stringify({ ...edit, price: Number(edit.price) || 0, stock: Number(edit.stock) || 0, maxPerPerson: Number(edit.maxPerPerson) || 1 }) });
      setEdit(null);
      onChange();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  async function pickImage(file?: File) {
    if (!file || !edit) return;
    setBusy(true);
    try {
      const imageUrl = await uploadShopImage(file);
      setEdit((d) => (d ? { ...d, imageUrl } : d));
    } catch {
      window.alert("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function remove(p: ShopProduct) {
    if (!window.confirm(`ลบ "${p.name}"? (ออเดอร์เก่ายังเก็บชื่อและราคาไว้)`)) return;
    try {
      await api(`/api/sale/products?id=${p.id}`, { method: "DELETE" });
      onChange();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setEdit({ ...EMPTY })} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"><Plus size={15} /> เพิ่มสินค้า</button>
      {products.length === 0 && <p className="py-12 text-center text-sm text-gray-400">ยังไม่มีสินค้า</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => (
          <Card key={p.id} className={cn("flex gap-3 p-3", !p.active && "opacity-50")}>
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300"><ImagePlus size={22} /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-sm text-gray-700">{baht(p.price)}</p>
              <p className={cn("text-xs", p.stock <= 0 ? "text-red-500" : "text-gray-500")}>คงเหลือ {p.stock} · คนละไม่เกิน {p.maxPerPerson}{!p.active && " · ซ่อน"}</p>
              <div className="mt-1 flex gap-1">
                <button onClick={() => setEdit({ id: p.id, name: p.name, description: p.description, price: String(p.price), stock: String(p.stock), maxPerPerson: String(p.maxPerPerson), imageUrl: p.imageUrl, active: p.active })} className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="แก้ไข"><Pencil size={13} /></button>
                <button onClick={() => remove(p)} className="rounded-md border border-gray-200 p-1.5 text-red-500 hover:bg-red-50" aria-label="ลบ"><Trash2 size={13} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEdit(null)}>
          <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-semibold">{edit.id ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}</h3><button onClick={() => setEdit(null)}><X size={18} /></button></div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 text-sm text-gray-400">
              {edit.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={edit.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex items-center gap-1.5"><ImagePlus size={18} /> ใส่รูปสินค้า</span>
              )}
            </button>
            <input className={field} placeholder="ชื่อสินค้า" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <textarea className={field} rows={2} placeholder="รายละเอียด (ไม่บังคับ)" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-gray-500">ราคา (บาท)<input className={field} inputMode="decimal" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></label>
              <label className="text-xs text-gray-500">สต็อก (ชิ้น)<input className={field} inputMode="numeric" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} /></label>
              <label className="text-xs text-gray-500">จำกัดต่อคน<input className={field} inputMode="numeric" value={edit.maxPerPerson} onChange={(e) => setEdit({ ...edit, maxPerPerson: e.target.value })} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> แสดงในหน้าขาย</label>
            <button disabled={busy || !edit.name.trim()} onClick={save} className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-40">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsForm({ initial, onSaved }: { initial: Settings; onSaved: () => void }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  async function save() {
    setBusy(true);
    setOk(false);
    try {
      await api("/api/sale/settings", { method: "PUT", body: JSON.stringify(s) });
      setOk(true);
      onSaved();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-3 p-4">
      <a href="/gift" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-brand-600 hover:underline"><ExternalLink size={14} /> เปิดหน้าขาย /gift</a>
      <label className="block text-xs text-gray-500">ชื่อหน้าขาย<input className={field} value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /></label>
      <label className="block text-xs text-gray-500">ข้อความต้อนรับ<textarea className={field} rows={3} value={s.intro} onChange={(e) => setS({ ...s, intro: e.target.value })} /></label>
      <label className="block text-xs text-gray-500">พร้อมเพย์ (เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก)<input className={field} inputMode="numeric" value={s.promptpayId} onChange={(e) => setS({ ...s, promptpayId: e.target.value })} /></label>
      <label className="block text-xs text-gray-500">ให้ลูกค้าแคปหน้าสำเร็จส่งที่<input className={field} value={s.lineNote} onChange={(e) => setS({ ...s, lineNote: e.target.value })} /></label>
      <label className="block text-xs text-gray-500">ลิงก์ LINE (ขึ้นต้น https:// ลูกค้ากดได้จากหน้าสำเร็จ)<input className={field} placeholder="https://line.me/R/ti/p/@..." value={s.lineUrl} onChange={(e) => setS({ ...s, lineUrl: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.isOpen} onChange={(e) => setS({ ...s, isOpen: e.target.checked })} /> เปิดรับออเดอร์</label>
      <button disabled={busy} onClick={save} className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-40">{busy ? "กำลังบันทึก…" : ok ? "บันทึกแล้ว ✓" : "บันทึก"}</button>
    </Card>
  );
}

type StockLink = { id: string; label: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null; createdAt: string };

// Temporary links that let a helper change stock (nothing else) without logging in.
function StockLinks() {
  const [links, setLinks] = useState<StockLink[]>([]);
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState("24");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const load = useCallback(() => api<{ links: StockLink[] }>("/api/sale/stock-links").then((d) => setLinks(d.links)).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    try {
      const d = await api<{ path: string }>("/api/sale/stock-links", { method: "POST", body: JSON.stringify({ label, hours: Number(hours) }) });
      setFresh(`${window.location.origin}${d.path}`);
      setCopied(false);
      setLabel("");
      load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "สร้างลิงก์ไม่สำเร็จ");
    }
  }
  async function revoke(l: StockLink) {
    if (!window.confirm("ยกเลิกลิงก์นี้? คนที่ถือลิงก์จะเข้าไม่ได้ทันที")) return;
    await api(`/api/sale/stock-links?id=${l.id}`, { method: "DELETE" }).catch(() => {});
    load();
  }
  const now = Date.now();

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold">ลิงก์จัดการสต็อกชั่วคราว (สำหรับแอดมินช่วยดูแล)</p>
        <p className="text-xs text-gray-500">คนที่ได้ลิงก์ปรับจำนวนสต็อกได้อย่างเดียว ไม่เห็นออเดอร์ ที่อยู่ หรือเบอร์ลูกค้า ลิงก์หมดอายุเอง และยกเลิกได้ทุกเมื่อ</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input className={cn(field, "flex-1")} placeholder="ชื่อคนที่ให้ (จำไว้เอง เช่น น้องเอ)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <select value={hours} onChange={(e) => setHours(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-2 text-sm">
          <option value="6">6 ชั่วโมง</option>
          <option value="24">1 วัน</option>
          <option value="72">3 วัน</option>
          <option value="168">7 วัน</option>
          <option value="720">30 วัน</option>
        </select>
        <button onClick={create} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">สร้างลิงก์</button>
      </div>
      {fresh && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">คัดลอกลิงก์นี้ส่งให้เลย จะแสดงครั้งเดียวเท่านั้น (ปิดแล้วดูซ้ำไม่ได้ ต้องสร้างใหม่)</p>
          <p className="break-all rounded bg-white px-2 py-1.5 font-mono text-xs">{fresh}</p>
          <button onClick={() => navigator.clipboard.writeText(fresh).then(() => setCopied(true)).catch(() => {})} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium">{copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}</button>
        </div>
      )}
      {links.length > 0 && (
        <ul className="divide-y divide-gray-100 text-sm">
          {links.map((l) => {
            const dead = !!l.revokedAt || new Date(l.expiresAt).getTime() < now;
            return (
              <li key={l.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate", dead && "text-gray-400 line-through")}>{l.label || "(ไม่ได้ตั้งชื่อ)"}</p>
                  <p className="text-[11px] text-gray-400">
                    {l.revokedAt ? "ยกเลิกแล้ว" : dead ? "หมดอายุแล้ว" : `หมดอายุ ${new Date(l.expiresAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}`}
                    {l.lastUsedAt && ` · ใช้ล่าสุด ${new Date(l.lastUsedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}`}
                  </p>
                </div>
                {!dead && <button onClick={() => revoke(l)} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">ยกเลิก</button>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

type Line = { id: string; name: string; price: number; qty: number };

// Edit an order: customer details and items. Stock follows (more = takes stock, fewer = gives back).
function EditOrder({ order, products, onClose, onSaved }: { order: Order; products: ShopProduct[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: order.name, phone: order.phone, address: order.address, note: order.note });
  const [lines, setLines] = useState<Line[]>(order.items.filter((i) => i.productId).map((i) => ({ id: i.productId as string, name: i.name, price: i.price, qty: i.qty })));
  const fixed = order.items.filter((i) => !i.productId); // product was deleted later: can't be changed
  const [add, setAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const total = lines.reduce((n, l) => n + l.price * l.qty, 0) + fixed.reduce((n, l) => n + l.price * l.qty, 0);
  const addable = products.filter((p) => !lines.some((l) => l.id === p.id));

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/sale/orders", { method: "PUT", body: JSON.stringify({ id: order.id, ...f, items: lines.map((l) => ({ id: l.id, qty: l.qty })) }) });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-semibold">แก้ไขออเดอร์ <span className="font-mono text-sm">{order.code}</span></h3><button onClick={onClose} aria-label="ปิด"><X size={18} /></button></div>
        <input className={field} placeholder="ชื่อผู้รับ" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={field} inputMode="tel" placeholder="เบอร์โทร" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <textarea className={field} rows={3} placeholder="ที่อยู่จัดส่ง" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <input className={field} placeholder="หมายเหตุ" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />

        <div className="rounded-xl border border-gray-200 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">รายการสินค้า (สต็อกปรับตามที่แก้อัตโนมัติ)</p>
          {lines.map((l) => (
            <div key={l.id} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm">{l.name} <span className="text-gray-400">{baht(l.price)}</span></span>
              <button onClick={() => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} className="h-7 w-7 rounded-full border border-gray-300 text-base leading-none" aria-label="ลด">−</button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
              <button onClick={() => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, qty: x.qty + 1 } : x)))} className="h-7 w-7 rounded-full border border-gray-300 text-base leading-none" aria-label="เพิ่ม">+</button>
              <button onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} className="rounded-md p-1 text-red-500 hover:bg-red-50" aria-label="เอาออก"><Trash2 size={14} /></button>
            </div>
          ))}
          {fixed.map((l, k) => <p key={k} className="py-1 text-xs text-gray-400">{l.name} × {l.qty} (สินค้าถูกลบแล้ว แก้ไม่ได้)</p>)}
          {addable.length > 0 && (
            <select value={add} onChange={(e) => { const p = products.find((x) => x.id === e.target.value); if (p) setLines((ls) => [...ls, { id: p.id, name: p.name, price: p.price, qty: 1 }]); setAdd(""); }} className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-2 py-2 text-sm text-gray-600">
              <option value="">+ เพิ่มสินค้า…</option>
              {addable.map((p) => <option key={p.id} value={p.id}>{p.name} ({baht(p.price)}, เหลือ {p.stock})</option>)}
            </select>
          )}
          <p className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold"><span>ยอดรวมใหม่</span><span className="tabular-nums">{baht(total)}{total !== order.total && <span className="ml-1 text-xs font-normal text-amber-600">(เดิม {baht(order.total)})</span>}</span></p>
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        <button disabled={busy} onClick={save} className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-40">{busy ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}</button>
      </div>
    </div>
  );
}
