import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { isUuid } from "@/lib/aiApi";
import { LIMITS, clientIp } from "@/lib/rateLimitRules";
import { hashKey, record, tooMany } from "@/lib/rateLimit";
import { loadProducts, stockLinkWorkspace } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

// Temporary helper link: list products with their stock, and change the stock. Nothing else —
// no orders, no customer data, no prices.
async function gate(request: Request, token: string) {
  const ip = hashKey(clientIp(request.headers));
  if (await tooMany("shop_stock_bad", ip, LIMITS.pinFailPerIp)) return { res: NextResponse.json({ error: "ลองหลายครั้งเกินไป" }, { status: 429 }) };
  const link = await stockLinkWorkspace(token);
  if (!link) {
    await record("shop_stock_bad", ip);
    return { res: NextResponse.json({ error: "ลิงก์นี้หมดอายุหรือถูกยกเลิกแล้ว" }, { status: 404 }) };
  }
  return { link };
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const g = await gate(request, token);
  if (g.res) return g.res;
  const products = await loadProducts(g.link!.ws, false);
  return NextResponse.json({ products: products.map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, stock: p.stock, active: p.active })) });
}

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  const g = await gate(request, typeof b.token === "string" ? b.token : "");
  if (g.res) return g.res;
  if (!isUuid(b.id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const delta = Number.isInteger(b.delta) ? Math.max(-1000, Math.min(1000, b.delta)) : null;
  const set = Number.isInteger(b.set) ? Math.max(0, Math.min(1_000_000, b.set)) : null;
  if (delta === null && set === null) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { ws, id } = g.link!;
  const { data, error } = await workspaceDb(ws).rpc("shop_adjust_stock", { p_ws: ws, p_id: b.id, p_delta: delta, p_set: set });
  if (error || data === null) return NextResponse.json({ error: "ปรับสต็อกไม่สำเร็จ" }, { status: 500 });
  await createAdminClient().from("shop_stock_links").update({ last_used_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true, stock: data });
}
