import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { isUuid } from "@/lib/aiApi";
import { saleStaff } from "@/lib/shopServer";
import { parseCart, validPhone } from "@/lib/shop";

export const dynamic = "force-dynamic";

// GET → every order with its items; GET ?slip=<order id> → redirect to the payment slip.
export async function GET(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const db = workspaceDb(me.workspaceId);
  const slip = request.nextUrl.searchParams.get("slip");
  if (slip) {
    if (!isUuid(slip)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
    const { data: o } = await db.from("shop_orders").select("slip_path").eq("id", slip).maybeSingle();
    if (!o?.slip_path) return NextResponse.json({ error: "ไม่พบสลิป" }, { status: 404 });
    const { data } = await createAdminClient().storage.from("shop-slips").createSignedUrl(o.slip_path as string, 600);
    if (!data?.signedUrl) return NextResponse.json({ error: "ไม่พบสลิป" }, { status: 404 });
    return NextResponse.redirect(data.signedUrl);
  }
  const { data: orders } = await db.from("shop_orders").select("id, code, name, phone, address, note, total, slip_path, status, created_at").order("created_at", { ascending: false });
  const ids = (orders ?? []).map((o) => o.id as string);
  const { data: items } = ids.length ? await db.from("shop_order_items").select("order_id, product_id, name, price, qty").in("order_id", ids) : { data: [] };
  const by = new Map<string, { productId: string | null; name: string; price: number; qty: number }[]>();
  for (const i of items ?? []) by.set(i.order_id as string, [...(by.get(i.order_id as string) ?? []), { productId: (i.product_id as string | null) ?? null, name: i.name as string, price: Number(i.price), qty: Number(i.qty) }]);
  return NextResponse.json({
    orders: (orders ?? []).map((o) => ({
      id: o.id, code: o.code, name: o.name, phone: o.phone, address: o.address, note: o.note, total: Number(o.total),
      hasSlip: !!o.slip_path, status: o.status, createdAt: o.created_at, items: by.get(o.id as string) ?? [],
    })),
  });
}

const STATUSES = new Set(["paid_pending", "confirmed", "shipped", "cancelled"]);

export async function PATCH(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const { id, status } = await request.json().catch(() => ({}));
  if (!isUuid(id) || typeof status !== "string" || !STATUSES.has(status)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = workspaceDb(me.workspaceId);
  const { data: cur } = await db.from("shop_orders").select("status").eq("id", id).maybeSingle();
  if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (cur.status === "cancelled") return NextResponse.json({ error: "ออเดอร์ที่ยกเลิกแล้วเปลี่ยนไม่ได้" }, { status: 409 });
  if (status === "cancelled") {
    const { error } = await db.rpc("shop_cancel_order", { p_ws: me.workspaceId, p_order: id }); // gives the stock back
    if (error) return NextResponse.json({ error: "ยกเลิกไม่สำเร็จ" }, { status: 500 });
  } else {
    const { error } = await db.from("shop_orders").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Edit an order: { id, name, phone, address, note, items: [{ id: productId, qty }] }.
// Stock is adjusted inside the database (shop_update_order); lines of deleted products stay as they are.
export async function PUT(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const b = await request.json().catch(() => ({}));
  const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = t(b.name, 120);
  const phone = t(b.phone, 30).replace(/\D/g, "");
  const address = t(b.address, 600);
  const items = parseCart(b.items === undefined ? null : (b.items as unknown[]).filter((i) => (i as { qty?: number })?.qty !== 0));
  if (!isUuid(b.id) || !name || !address || !validPhone(phone)) return NextResponse.json({ error: "กรอกชื่อ เบอร์โทร (10 หลัก) และที่อยู่ให้ถูกต้อง" }, { status: 400 });
  if (!items) return NextResponse.json({ error: "รายการสินค้าไม่ถูกต้อง" }, { status: 400 });
  const { error } = await workspaceDb(me.workspaceId).rpc("shop_update_order", {
    p_ws: me.workspaceId, p_order: b.id, p_name: name, p_phone: phone, p_address: address, p_note: t(b.note, 300), p_items: items,
  });
  if (error) {
    const m = error.message;
    if (/STOCK:/.test(m)) return NextResponse.json({ error: "สต็อกไม่พอสำหรับจำนวนที่เพิ่ม" }, { status: 409 });
    if (/GONE:/.test(m)) return NextResponse.json({ error: "สินค้านี้ไม่อยู่ในระบบแล้ว" }, { status: 409 });
    if (/CANCELLED/.test(m)) return NextResponse.json({ error: "ออเดอร์ที่ยกเลิกแล้วแก้ไม่ได้" }, { status: 409 });
    if (/EMPTY/.test(m)) return NextResponse.json({ error: "ต้องมีสินค้าอย่างน้อย 1 รายการ (ถ้าไม่เอาแล้วให้ยกเลิกออเดอร์)" }, { status: 400 });
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
