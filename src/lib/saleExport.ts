import { ORDER_STATUS_LABEL } from "@/lib/shop";
import type { Cell, Sheet } from "@/lib/xlsx";

type ExportOrder = {
  code: string; name: string; phone: string; address: string; note: string; total: number; hasSlip: boolean; status: string; createdAt: string;
  items: { name: string; price: number; qty: number }[];
};
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

// Sheet 1: one row per customer (same phone number, cancelled orders left out).
// Sheet 2: one row per order. Sheet 3: one row per product line.
export function saleSheets(orders: ExportOrder[]): Sheet[] {
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const live = sorted.filter((o) => o.status !== "cancelled");
  const byPhone = new Map<string, ExportOrder[]>();
  for (const o of live) byPhone.set(o.phone, [...(byPhone.get(o.phone) ?? []), o]);

  const customers: Cell[][] = [["ชื่อ", "เบอร์โทร", "ที่อยู่ (ล่าสุด)", "จำนวนออเดอร์", "จำนวนชิ้น", "ยอดรวม (บาท)", "สินค้าที่สั่ง", "สั่งครั้งแรก", "สั่งครั้งล่าสุด", "รหัสออเดอร์", "หมายเหตุ"]];
  for (const [phone, list] of byPhone) {
    const last = list[list.length - 1];
    const prod = new Map<string, number>();
    for (const o of list) for (const i of o.items) prod.set(i.name, (prod.get(i.name) ?? 0) + i.qty);
    customers.push([last.name, phone, last.address, list.length, [...prod.values()].reduce((a, b) => a + b, 0), list.reduce((n, o) => n + o.total, 0), [...prod].map(([n, q]) => `${n} ×${q}`).join("\n"), when(list[0].createdAt), when(last.createdAt), list.map((o) => o.code).join(", "), list.map((o) => o.note).filter(Boolean).join(" / ")]);
  }

  const orderRows: Cell[][] = [["รหัสออเดอร์", "วันที่สั่ง", "สถานะ", "ชื่อ", "เบอร์โทร", "ที่อยู่", "หมายเหตุ", "สินค้า", "จำนวนชิ้น", "ยอดรวม (บาท)", "มีสลิป"]];
  for (const o of sorted) orderRows.push([o.code, when(o.createdAt), ORDER_STATUS_LABEL[o.status] ?? o.status, o.name, o.phone, o.address, o.note, o.items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join("\n"), o.items.reduce((n, i) => n + i.qty, 0), o.total, o.hasSlip ? "มี" : "ไม่มี"]);

  const lines: Cell[][] = [["รหัสออเดอร์", "สถานะ", "ชื่อ", "เบอร์โทร", "สินค้า", "ราคา/ชิ้น", "จำนวน", "รวม"]];
  for (const o of sorted) for (const i of o.items) lines.push([o.code, ORDER_STATUS_LABEL[o.status] ?? o.status, o.name, o.phone, i.name, i.price, i.qty, i.price * i.qty]);

  return [
    { name: "ลูกค้า", rows: customers, widths: [22, 14, 50, 12, 10, 14, 30, 18, 18, 30, 30] },
    { name: "ออเดอร์", rows: orderRows, widths: [14, 18, 14, 22, 14, 50, 24, 30, 10, 14, 10] },
    { name: "รายการสินค้า", rows: lines, widths: [14, 14, 22, 14, 24, 12, 8, 12] },
  ];
}
