import { NextResponse } from "next/server";
import { checkCart, normalizePhone, parseCart, promptPayPayload } from "@/lib/shop";
import { SHOP_WORKSPACE_ID, alreadyOrdered, loadProducts, loadSettings } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

// Between "pick things" and "pay": re-check stock and the per-person limit right now, and only
// then hand out the PromptPay QR for the exact total. {cart, phone?} → {ok, total, lines, problems, qr}
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const cart = parseCart(body.cart);
  if (!cart) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
  const [settings, products, already] = await Promise.all([
    loadSettings(SHOP_WORKSPACE_ID),
    loadProducts(SHOP_WORKSPACE_ID, true),
    phone ? alreadyOrdered(SHOP_WORKSPACE_ID, phone) : Promise.resolve({}),
  ]);
  if (!settings.isOpen) return NextResponse.json({ error: "ปิดรับออเดอร์ชั่วคราว" }, { status: 409 });
  const check = checkCart(products, cart, already);
  const qr = check.ok && settings.promptpayId ? promptPayPayload(settings.promptpayId, check.total) : null;
  return NextResponse.json({ ...check, qr });
}
