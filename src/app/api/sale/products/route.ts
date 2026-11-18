import { NextResponse, type NextRequest } from "next/server";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { isUuid } from "@/lib/aiApi";
import { loadProducts, saleStaff } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  return NextResponse.json({ products: await loadProducts(me.workspaceId, false) });
}

const int = (v: unknown, min: number, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

export async function POST(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const b = await request.json().catch(() => ({}));
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "ใส่ชื่อสินค้า" }, { status: 400 });
  const price = Math.max(0, Math.round(Number(b.price) * 100) / 100);
  if (!Number.isFinite(price)) return NextResponse.json({ error: "ราคาไม่ถูกต้อง" }, { status: 400 });
  const row = {
    name,
    description: typeof b.description === "string" ? b.description.trim().slice(0, 600) : "",
    price,
    stock: int(b.stock, 0, 1_000_000),
    max_per_person: int(b.maxPerPerson, 1, 1000),
    image_url: typeof b.imageUrl === "string" && /^https:\/\//.test(b.imageUrl) ? b.imageUrl.slice(0, 500) : null,
    active: b.active !== false,
    sort_order: int(b.sortOrder, 0, 100000),
  };
  const db = workspaceDb(me.workspaceId);
  if (b.id !== undefined && b.id !== null) {
    if (!isUuid(b.id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
    const { error } = await db.from("shop_products").update(row).eq("id", b.id);
    if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const { data, error } = await db.from("shop_products").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { error } = await workspaceDb(me.workspaceId).from("shop_products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
