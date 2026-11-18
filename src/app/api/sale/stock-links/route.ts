import { NextResponse, type NextRequest } from "next/server";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { isUuid } from "@/lib/aiApi";
import { hashStockToken, newStockToken, saleStaff } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const { data } = await workspaceDb(me.workspaceId).from("shop_stock_links").select("id, label, expires_at, revoked_at, last_used_at, created_at").order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ links: (data ?? []).map((l) => ({ id: l.id, label: l.label, expiresAt: l.expires_at, revokedAt: l.revoked_at, lastUsedAt: l.last_used_at, createdAt: l.created_at })) });
}

// Make a link. The secret is only returned here; the database keeps its hash.
export async function POST(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const b = await request.json().catch(() => ({}));
  const hours = Math.min(24 * 30, Math.max(1, Math.floor(Number(b.hours) || 24)));
  const label = typeof b.label === "string" ? b.label.trim().slice(0, 60) : "";
  const token = newStockToken();
  const { error } = await workspaceDb(me.workspaceId).from("shop_stock_links").insert({ token_hash: hashStockToken(token), label, expires_at: new Date(Date.now() + hours * 3_600_000).toISOString() });
  if (error) return NextResponse.json({ error: "สร้างลิงก์ไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true, path: `/gift/stock/${token}` });
}

export async function DELETE(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { error } = await workspaceDb(me.workspaceId).from("shop_stock_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: "ยกเลิกไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
