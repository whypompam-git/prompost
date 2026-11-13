import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { requireMe } from "@/lib/myWork";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// CI Brand of a client the editor is working for (read only).
export async function GET(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!isUuid(clientId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = createAdminClient();
  const { data: mine } = await db.from("tasks").select("id").eq("client_id", clientId).eq("editor_id", me.staffId).limit(1);
  if (!mine?.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [{ data: ci }, { data: client }] = await Promise.all([
    db.from("client_ci").select("logo_url, colors, fonts, subtitle_style, dont, files, notes").eq("client_id", clientId).maybeSingle(),
    db.from("clients").select("name").eq("id", clientId).maybeSingle(),
  ]);
  return NextResponse.json({ clientName: client?.name ?? "", ci: ci ?? null });
}
