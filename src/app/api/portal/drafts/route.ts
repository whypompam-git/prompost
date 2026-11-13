import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";
import { signedDraftUrl } from "@/lib/draftsServer";

export const dynamic = "force-dynamic";

// The client's review feed: clips waiting for them (Pending) with the latest
// draft to watch. View only — no download link is handed out.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("clientKey") ?? "";
  if (!key) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("id, name, color_tag, brand_images, portal_enabled").eq(isUuid(key) ? "portal_token" : "slug", key).maybeSingle();
  if (!client || !client.portal_enabled) return NextResponse.json({ error: "link inactive" }, { status: 403 });
  const [{ data: tasks }, { data: ci }] = await Promise.all([
    db.from("tasks").select("id, title, revision_count").eq("client_id", client.id).eq("type", "pending").order("edit_date"),
    db.from("client_ci").select("logo_url").eq("client_id", client.id).maybeSingle(),
  ]);
  const ids = (tasks ?? []).map((t) => t.id);
  const { data: drafts } = ids.length
    ? await db.from("task_drafts").select("id, task_id, version, path").in("task_id", ids).is("removed_at", null).order("version", { ascending: false })
    : { data: [] as { id: string; task_id: string; version: number; path: string }[] };
  const latest = new Map<string, { id: string; version: number; path: string }>();
  for (const d of drafts ?? []) if (!latest.has(d.task_id)) latest.set(d.task_id, d);
  const items = await Promise.all(
    (tasks ?? [])
      .filter((t) => latest.has(t.id))
      .map(async (t) => {
        const d = latest.get(t.id)!;
        return {
          taskId: t.id,
          title: t.title,
          clientId: client.id,
          clientName: client.name,
          clientColor: client.color_tag ?? "orange",
          logo: ci?.logo_url || client.brand_images?.[0] || "",
          editorName: "",
          revisionCount: t.revision_count ?? 0,
          draft: { id: d.id, version: d.version, url: await signedDraftUrl(d.path) },
          comments: [],
        };
      }),
  );
  return NextResponse.json({ items, withoutDraft: (tasks ?? []).filter((t) => !latest.has(t.id)).map((t) => ({ id: t.id, title: t.title })) });
}
