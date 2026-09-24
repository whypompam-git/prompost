import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const TEXT_FIELDS = { scriptText: "script_text", refLink: "ref_link", footageUrl: "footage_url", finalUrl: "final_url" } as const;
const LIST_FIELDS = { shots: "shots", equipment: "equipment" } as const;

// Client-facing edits. Only content fields are writable (never status,
// dates, assignee, title…), the link key must be active, and the task must
// belong to that client.
export async function POST(request: Request) {
  const { clientKey, taskId, patch } = await request.json().catch(() => ({}));
  if (typeof clientKey !== "string" || typeof taskId !== "string" || typeof patch !== "object" || !patch) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(TEXT_FIELDS)) {
    if (key in patch) {
      const v = patch[key];
      if (typeof v !== "string" || v.length > 20000) return NextResponse.json({ error: "invalid field" }, { status: 400 });
      update[col] = v;
    }
  }
  for (const [key, col] of Object.entries(LIST_FIELDS)) {
    if (key in patch) {
      const v = patch[key];
      if (!Array.isArray(v) || v.length > 100 || v.some((x) => typeof x !== "string" || x.length > 300)) {
        return NextResponse.json({ error: "invalid field" }, { status: 400 });
      }
      update[col] = v;
    }
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, portal_enabled")
    .eq(isUuid(clientKey) ? "portal_token" : "slug", clientKey)
    .maybeSingle();
  if (!client || !client.portal_enabled) return NextResponse.json({ error: "link inactive" }, { status: 403 });

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("client_id", client.id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
