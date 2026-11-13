import { NextResponse } from "next/server";
import { requireAiToken } from "@/lib/aiAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" };

// Set a client's logo (CI Brand → icon in the client grid) from the workspace tools.
// Body: { clientSlug, ext, base64 } — image only, up to 3 MB.
export async function POST(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const { clientSlug, ext, base64 } = await request.json().catch(() => ({}));
  const type = typeof ext === "string" ? TYPES[ext.toLowerCase()] : undefined;
  if (typeof clientSlug !== "string" || !type || typeof base64 !== "string" || base64.length > 4_200_000) {
    return NextResponse.json({ error: "ต้องมี clientSlug, ext (png/jpg/webp/svg), base64 (≤3 MB)" }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("id, name").eq("slug", clientSlug).maybeSingle();
  if (!client) return NextResponse.json({ error: `ไม่พบลูกค้า slug "${clientSlug}"` }, { status: 404 });

  const path = `logos/${client.id}-${Date.now()}.${ext.toLowerCase()}`;
  const { error: upErr } = await db.storage.from("client-brand").upload(path, Buffer.from(base64, "base64"), { contentType: type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  const url = db.storage.from("client-brand").getPublicUrl(path).data.publicUrl;
  const { error } = await db.from("client_ci").upsert({ client_id: client.id, logo_url: url, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, client: client.name, url });
}
