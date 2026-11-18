import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { isUuid } from "@/lib/aiApi";
import { saleStaff } from "@/lib/shopServer";

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
  const { data: items } = ids.length ? await db.from("shop_order_items").select("order_id, name, price, qty").in("order_id", ids) : { data: [] };
  const by = new Map<string, { name: string; price: number; qty: number }[]>();
  for (const i of items ?? []) by.set(i.order_id as string, [...(by.get(i.order_id as string) ?? []), { name: i.name as string, price: Number(i.price), qty: Number(i.qty) }]);
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
