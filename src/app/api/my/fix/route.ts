import { NextResponse, type NextRequest } from "next/server";
import { requireMe } from "@/lib/myWork";
import { signedDraftUrl } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The editor's "แก้งาน" feed: their clips back in editing that have a draft and
// comments (from our QC or straight from the client), newest draft first.
export async function GET(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const db = createAdminClient();
  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, client_id, revision_count, clients(name, color_tag, brand_images)")
    .eq("editor_id", me.staffId)
    .in("type", ["edit", "qc"])
    .limit(200);
  const ids = (tasks ?? []).map((t) => t.id);
  if (!ids.length) return NextResponse.json({ items: [] });
  const [{ data: drafts }, { data: comments }, { data: cis }] = await Promise.all([
    db.from("task_drafts").select("id, task_id, version, path").in("task_id", ids).is("removed_at", null).order("version", { ascending: false }),
    db.from("draft_comments").select("id, task_id, draft_id, from_client, at_seconds, body, created_at, editor_done_at").in("task_id", ids).order("created_at"),
    db.from("client_ci").select("client_id, logo_url"),
  ]);
  const latest = new Map<string, { id: string; version: number; path: string }>();
  for (const d of drafts ?? []) if (!latest.has(d.task_id)) latest.set(d.task_id, d);
  const logo = new Map((cis ?? []).map((r) => [r.client_id as string, r.logo_url as string | null]));
  const items = await Promise.all(
    (tasks ?? [])
      .filter((t) => latest.has(t.id))
      .map(async (t) => {
        const d = latest.get(t.id)!;
        const cl = (Array.isArray(t.clients) ? t.clients[0] : t.clients) as { name: string; color_tag: string; brand_images: string[] | null } | null;
        return {
          taskId: t.id,
          title: t.title,
          clientId: t.client_id,
          clientName: cl?.name ?? "",
          clientColor: cl?.color_tag ?? "orange",
          logo: logo.get(t.client_id) || cl?.brand_images?.[0] || "",
          editorName: "",
          revisionCount: t.revision_count ?? 0,
          draft: { id: d.id, version: d.version, url: await signedDraftUrl(d.path) },
          // comments on the latest draft; the editor ticks each one when it is fixed
          comments: (comments ?? [])
            .filter((c) => c.task_id === t.id && (c.draft_id === d.id || c.draft_id === null))
            .map((c) => ({ id: c.id, atSeconds: c.at_seconds == null ? null : Number(c.at_seconds), body: c.body, author: c.from_client ? "ลูกค้า" : "ทีม QC", fromClient: c.from_client, createdAt: c.created_at, resolved: Boolean(c.editor_done_at) })),
        };
      }),
  );
  return NextResponse.json({ items: items.filter((i) => i.comments.length > 0) });
}
