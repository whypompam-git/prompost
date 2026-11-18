import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { workspaceDb, PROMPOST_WORKSPACE_ID } from "@/lib/supabase/workspaceDb";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopProduct } from "@/lib/shop";

// SERVER-ONLY. The public /gift page sells for one workspace (the owner's own).
// the shop's public LINE link (shown to customers anyway); Sale → ตั้งค่า can override it
const DEFAULT_LINE_URL = "https://lin.ee/Zb7zhUI";
export const SHOP_WORKSPACE_ID = PROMPOST_WORKSPACE_ID;

type Row = Record<string, unknown>;

export function rowToProduct(r: Row): ShopProduct {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    price: Number(r.price ?? 0),
    stock: Number(r.stock ?? 0),
    maxPerPerson: Number(r.max_per_person ?? 1),
    imageUrl: (r.image_url as string | null) ?? null,
    active: r.active !== false,
    sortOrder: Number(r.sort_order ?? 0),
  };
}

export async function loadProducts(ws: string, onlyActive: boolean): Promise<ShopProduct[]> {
  let q = workspaceDb(ws).from("shop_products").select("*");
  if (onlyActive) q = q.eq("active", true);
  const { data } = await q.order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  return (data ?? []).map(rowToProduct);
}

export async function loadSettings(ws: string) {
  const { data } = await workspaceDb(ws).from("shop_settings").select("*").maybeSingle();
  return {
    title: (data?.title as string) || "Gift",
    intro: (data?.intro as string) || "",
    promptpayId: (data?.promptpay_id as string) || "",
    lineNote: (data?.line_note as string) || "LINE HOPS",
    lineUrl: (data?.line_url as string) || DEFAULT_LINE_URL,
    isOpen: data?.is_open !== false,
  };
}

// what a phone number already ordered (not cancelled), per product
export async function alreadyOrdered(ws: string, phone: string): Promise<Record<string, number>> {
  const db = workspaceDb(ws);
  const { data: orders } = await db.from("shop_orders").select("id").eq("phone", phone).neq("status", "cancelled");
  const ids = (orders ?? []).map((o) => o.id as string);
  if (!ids.length) return {};
  const { data: items } = await db.from("shop_order_items").select("product_id, qty").in("order_id", ids);
  const out: Record<string, number> = {};
  for (const i of items ?? []) if (i.product_id) out[i.product_id as string] = (out[i.product_id as string] ?? 0) + Number(i.qty);
  return out;
}


// Staff gate for the Sale back office: owner or anyone with the accounting permission.
export async function saleStaff(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ error: "account disabled" }, { status: 401 });
  if (live.ownOnly || !(live.role === "owner" || live.permissions.accounting)) return NextResponse.json({ error: "no access" }, { status: 403 });
  return live;
}


export const hashStockToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const newStockToken = () => randomBytes(24).toString("hex");

// A valid, unexpired, unrevoked stock link → its workspace; otherwise null.
export async function stockLinkWorkspace(token: string): Promise<{ ws: string; id: string } | null> {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const { data } = await createAdminClient()
    .from("shop_stock_links")
    .select("id, workspace_id, expires_at, revoked_at")
    .eq("token_hash", hashStockToken(token))
    .maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return { ws: data.workspace_id as string, id: data.id as string };
}
