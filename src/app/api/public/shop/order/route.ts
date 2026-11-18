import { NextResponse } from "next/server";
import { checkCart, newOrderCode, normalizePhone, parseCart, problemText, validPhone } from "@/lib/shop";
import { LIMITS, clientIp } from "@/lib/rateLimitRules";
import { hashKey, record, tooMany } from "@/lib/rateLimit";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { SHOP_WORKSPACE_ID, alreadyOrdered, loadProducts, loadSettings } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  const ip = hashKey(clientIp(request.headers));
  if (await tooMany("shop_order", ip, LIMITS.shopOrderPerIpHour)) return NextResponse.json({ error: "สั่งหลายครั้งเกินไป รอสักพักแล้วลองใหม่" }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const cart = parseCart(body.cart);
  const name = text(body.name, 120);
  const phone = normalizePhone(text(body.phone, 30));
  const address = text(body.address, 600);
  const note = text(body.note, 300);
  const slip = text(body.slip, 100);
  if (!cart || !name || !address) return NextResponse.json({ error: "กรอกชื่อและที่อยู่ให้ครบ" }, { status: 400 });
  if (!validPhone(phone)) return NextResponse.json({ error: "เบอร์โทรไม่ถูกต้อง" }, { status: 400 });
  if (!/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic|gif)$/.test(slip)) return NextResponse.json({ error: "แนบสลิปก่อนยืนยัน" }, { status: 400 });

  const [settings, products, already] = await Promise.all([
    loadSettings(SHOP_WORKSPACE_ID),
    loadProducts(SHOP_WORKSPACE_ID, true),
    alreadyOrdered(SHOP_WORKSPACE_ID, phone),
  ]);
  if (!settings.isOpen) return NextResponse.json({ error: "ปิดรับออเดอร์ชั่วคราว" }, { status: 409 });
  const check = checkCart(products, cart, already);
  if (!check.ok) return NextResponse.json({ error: check.problems.map(problemText).join(" / ") || "ตะกร้าว่าง", problems: check.problems }, { status: 409 });

  const db = workspaceDb(SHOP_WORKSPACE_ID);
  // the database repeats the checks under a lock; a race (someone bought the last one a moment ago) ends up here
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newOrderCode();
    const { data, error } = await db.rpc("shop_place_order", {
      p_ws: SHOP_WORKSPACE_ID, p_code: code, p_name: name, p_phone: phone, p_address: address, p_note: note, p_slip: slip,
      p_items: check.lines.map((l) => ({ id: l.id, qty: l.qty })),
    });
    if (!error && data) {
      await record("shop_order", ip);
      return NextResponse.json({ ok: true, code: data.code, total: data.total });
    }
    const msg = error?.message ?? "";
    if (/STOCK:|GONE:|LIMIT:/.test(msg)) return NextResponse.json({ error: "ของเพิ่งหมดหรือเกินจำนวนที่สั่งได้ กลับไปเช็คตะกร้าอีกครั้ง", race: true }, { status: 409 });
    if (/CLOSED/.test(msg)) return NextResponse.json({ error: "ปิดรับออเดอร์ชั่วคราว" }, { status: 409 });
    if (!/duplicate key|shop_orders_workspace_id_code_key/.test(msg)) return NextResponse.json({ error: "บันทึกออเดอร์ไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
  }
  return NextResponse.json({ error: "บันทึกออเดอร์ไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
}

// The success page can be reloaded: look an order up by its code.
export async function GET(request: Request) {
  const ip = hashKey(clientIp(request.headers));
  if (await tooMany("shop_lookup", ip, LIMITS.shopLookupPerIp)) return NextResponse.json({ error: "ลองหลายครั้งเกินไป" }, { status: 429 });
  await record("shop_lookup", ip);
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!/^G-[A-Z0-9]{8}$/.test(code)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = workspaceDb(SHOP_WORKSPACE_ID);
  const { data: o } = await db.from("shop_orders").select("id, code, name, phone, address, total, status, created_at").eq("code", code).maybeSingle();
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: items } = await db.from("shop_order_items").select("name, price, qty").eq("order_id", o.id);
  const settings = await loadSettings(SHOP_WORKSPACE_ID);
  return NextResponse.json({ code: o.code, name: o.name, phone: o.phone, address: o.address, total: Number(o.total), status: o.status, createdAt: o.created_at, items: items ?? [], lineNote: settings.lineNote });
}
