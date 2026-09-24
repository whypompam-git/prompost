import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Client-facing script edit — the only thing the client link can change.
// Requires an active link and a task that belongs to that client.
export async function POST(request: Request) {
  const { clientKey, taskId, scriptText } = await request.json().catch(() => ({}));
  if (
    typeof clientKey !== "string" ||
    typeof taskId !== "string" ||
    typeof scriptText !== "string" ||
    scriptText.length > 20000
  ) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, portal_enabled")
    .eq(isUuid(clientKey) ? "portal_token" : "slug", clientKey)
    .maybeSingle();
  if (!client || !client.portal_enabled) return NextResponse.json({ error: "link inactive" }, { status: 403 });

  const { data, error } = await supabase
    .from("tasks")
    .update({ script_text: scriptText })
    .eq("id", taskId)
    .eq("client_id", client.id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
