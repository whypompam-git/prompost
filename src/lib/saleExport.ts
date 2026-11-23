import { ORDER_STATUS_LABEL, groupOrders } from "@/lib/shop";
import { splitThaiAddress } from "@/lib/thaiAddress";
import type { Cell, Sheet } from "@/lib/xlsx";

type ExportOrder = {
  id: string; code: string; name: string; phone: string; address: string; note: string; total: number; hasSlip: boolean; status: string; createdAt: string;
  items: { name: string; price: number; qty: number }[];
};
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
const itemsText = (o: ExportOrder) => o.items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join("\n");

// Columns Thai Post bulk sending asks for, one row per parcel (address split as far as it can be).
const POST_HEAD = ["ลำดับ", "กลุ่ม", "รหัสออเดอร์", "ชื่อผู้รับ", "เบอร์โทร", "ที่อยู่ (เลขที่ / ซอย / ถนน)", "ตำบล/แขวง", "อำเภอ/เขต", "จังหวัด", "รหัสไปรษณีย์", "ที่อยู่เต็ม (ตามที่ลูกค้ากรอก)", "สินค้า", "จำนวนชิ้น", "หมายเหตุ", "ต้องตรวจที่อยู่"];
const POST_WIDTHS = [7, 8, 14, 22, 14, 44, 16, 16, 16, 12, 60, 30, 10, 24, 28];
function postRow(o: ExportOrder, n: number, group: number): Cell[] {
  const a = splitThaiAddress(o.address);
  return [n, group, o.code, o.name, o.phone, a.line, a.subdistrict, a.district, a.province, a.postcode, o.address.replace(/\s*\n\s*/g, " "), itemsText(o), o.items.reduce((s, i) => s + i.qty, 0), o.note, a.check];
}

// "รวม": every sheet sorted by item group. "แยก": a summary + one sheet per group (parcel list ready to print or send).
export function saleSheets(orders: ExportOrder[], mode: "combined" | "split" = "combined"): Sheet[] {
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const live = sorted.filter((o) => o.status !== "cancelled");
  const groups = groupOrders(live);
  const byId = new Map(live.map((o) => [o.id, o]));
  const groupOf = new Map<string, number>();
  const ordered: ExportOrder[] = [];
  groups.forEach((g, i) => g.ids.forEach((id) => { groupOf.set(id, i + 1); ordered.push(byId.get(id)!); }));

  const groupRows: Cell[][] = [["กลุ่ม", "ชุดสินค้า", "จำนวนออเดอร์", "จำนวนชิ้น", "รหัสออเดอร์", "ชื่อลูกค้า"]];
  groups.forEach((g, i) => {
    const os = g.ids.map((id) => byId.get(id)!);
    groupRows.push([i + 1, g.label, g.orders, g.pieces, os.map((o) => o.code).join(", "), os.map((o) => o.name).join(", ")]);
  });
  const need = new Map<string, number>();
  for (const o of live) for (const i of o.items) need.set(i.name, (need.get(i.name) ?? 0) + i.qty);
  const summary: Sheet[] = [
    { name: "จัดกลุ่ม", rows: groupRows, widths: [8, 50, 14, 12, 60, 60] },
    { name: "ของที่ต้องเตรียม", rows: [["สินค้า", "ต้องเตรียม (ชิ้น)"], ...[...need].map(([n, q]) => [n, q] as Cell[])], widths: [24, 18] },
  ];

  if (mode === "split") {
    const perGroup = groups.map((g, i): Sheet => {
      const rows: Cell[][] = [POST_HEAD];
      g.ids.forEach((id, k) => rows.push(postRow(byId.get(id)!, k + 1, i + 1)));
      const label = g.label.replace(/ \+ /g, "+");
      return { name: `${i + 1}. ${label}`, rows, widths: POST_WIDTHS };
    });
    return [...summary, ...perGroup];
  }

  const post: Cell[][] = [POST_HEAD, ...ordered.map((o, i) => postRow(o, i + 1, groupOf.get(o.id)!))];
  const byPhone = new Map<string, ExportOrder[]>();
  for (const o of live) byPhone.set(o.phone, [...(byPhone.get(o.phone) ?? []), o]);
  const customers: Cell[][] = [["ชื่อ", "เบอร์โทร", "ที่อยู่ (ล่าสุด)", "จำนวนออเดอร์", "จำนวนชิ้น", "ยอดรวม (บาท)", "สินค้าที่สั่ง", "สั่งครั้งแรก", "สั่งครั้งล่าสุด", "รหัสออเดอร์", "หมายเหตุ"]];
  for (const [phone, list] of byPhone) {
    const last = list[list.length - 1];
    const prod = new Map<string, number>();
    for (const o of list) for (const i of o.items) prod.set(i.name, (prod.get(i.name) ?? 0) + i.qty);
    customers.push([last.name, phone, last.address, list.length, [...prod.values()].reduce((a, b) => a + b, 0), list.reduce((n, o) => n + o.total, 0), [...prod].map(([n, q]) => `${n} ×${q}`).join("\n"), when(list[0].createdAt), when(last.createdAt), list.map((o) => o.code).join(", "), list.map((o) => o.note).filter(Boolean).join(" / ")]);
  }
  const orderRows: Cell[][] = [["กลุ่ม", "รหัสออเดอร์", "วันที่สั่ง", "สถานะ", "ชื่อ", "เบอร์โทร", "ที่อยู่", "หมายเหตุ", "สินค้า", "จำนวนชิ้น", "ยอดรวม (บาท)", "มีสลิป"]];
  for (const o of [...ordered, ...sorted.filter((o) => o.status === "cancelled")]) orderRows.push([groupOf.get(o.id) ?? "ยกเลิก", o.code, when(o.createdAt), ORDER_STATUS_LABEL[o.status] ?? o.status, o.name, o.phone, o.address, o.note, itemsText(o), o.items.reduce((n, i) => n + i.qty, 0), o.total, o.hasSlip ? "มี" : "ไม่มี"]);
  const lines: Cell[][] = [["กลุ่ม", "รหัสออเดอร์", "สถานะ", "ชื่อ", "เบอร์โทร", "สินค้า", "ราคา/ชิ้น", "จำนวน", "รวม"]];
  for (const o of [...ordered, ...sorted.filter((o) => o.status === "cancelled")]) for (const i of o.items) lines.push([groupOf.get(o.id) ?? "ยกเลิก", o.code, ORDER_STATUS_LABEL[o.status] ?? o.status, o.name, o.phone, i.name, i.price, i.qty, i.price * i.qty]);

  return [
    { name: "ที่อยู่จัดส่ง (ไปรษณีย์)", rows: post, widths: POST_WIDTHS },
    ...summary,
    { name: "ลูกค้า", rows: customers, widths: [22, 14, 50, 12, 10, 14, 30, 18, 18, 30, 30] },
    { name: "ออเดอร์", rows: orderRows, widths: [8, 14, 18, 14, 22, 14, 50, 24, 30, 10, 14, 10] },
    { name: "รายการสินค้า", rows: lines, widths: [8, 14, 14, 22, 14, 24, 12, 8, 12] },
  ];
}
