import { NextResponse, type NextRequest } from "next/server";
import { caller, signedDraftUrl } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The team's review feed: every clip in QC (In Review) that has an uploaded
// draft, newest version, with its comments; plus clips the client approved
// that still need to go to Drive.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });
  const db = createAdminClient();

  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, title, type, status, client_id, editor_id, revision_count, edit_date, final_url, clients(name, color_tag, brand_images)")
    .or("and(type.eq.qc,status.eq.review),and(type.eq.approved,final_url.is.null)")
    .limit(400);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (tasks ?? []).map((t) => t.id);
  if (!ids.length) return NextResponse.json({ review: [], deliver: [] });

  const [{ data: drafts }, { data: comments }, { data: cis }, { data: staff }] = await Promise.all([
    db.from("task_drafts").select("id, task_id, version, path, created_at, removed_at").in("task_id", ids).is("removed_at", null).order("version", { ascending: false }),
    db.from("draft_comments").select("id, task_id, draft_id, author_staff_id, from_client, at_seconds, body, created_at, resolved_at").in("task_id", ids).order("created_at"),
    db.from("client_ci").select("client_id, logo_url"),
    db.from("staff").select("id, name"),
  ]);
  const latest = new Map<string, NonNullable<typeof drafts>[number]>();
  for (const d of drafts ?? []) if (!latest.has(d.task_id)) latest.set(d.task_id, d);
  const logo = new Map((cis ?? []).map((r) => [r.client_id as string, r.logo_url as string | null]));
  const nameOf = (id?: string | null) => (staff ?? []).find((s) => s.id === id)?.name ?? "";

  const rows = await Promise.all(
    (tasks ?? [])
      .filter((t) => latest.has(t.id))
      .map(async (t) => {
        const d = latest.get(t.id)!;
        const cl = (Array.isArray(t.clients) ? t.clients[0] : t.clients) as { name: string; color_tag: string; brand_images: string[] | null } | null;
        const ext = d.path.slice(d.path.lastIndexOf("."));
        return {
          taskId: t.id,
          title: t.title,
          stage: t.type,
          clientId: t.client_id,
          clientName: cl?.name ?? "",
          clientColor: cl?.color_tag ?? "orange",
          logo: logo.get(t.client_id) || cl?.brand_images?.[0] || "",
          editorName: nameOf(t.editor_id),
          revisionCount: t.revision_count ?? 0,
          editDate: t.edit_date,
          draft: { id: d.id, version: d.version, url: await signedDraftUrl(d.path), downloadUrl: await signedDraftUrl(d.path, `${cl?.name ?? ""} ${t.title} v${d.version}${ext}`.replace(/[\\/:*?"<>|]/g, " ")) },
          comments: (comments ?? [])
            .filter((m) => m.task_id === t.id)
            .map((m) => ({ id: m.id, draftId: m.draft_id, atSeconds: m.at_seconds == null ? null : Number(m.at_seconds), body: m.body, fromClient: m.from_client, author: m.from_client ? "ลูกค้า" : nameOf(m.author_staff_id), createdAt: m.created_at, resolved: Boolean(m.resolved_at) })),
        };
      }),
  );
  return NextResponse.json({ review: rows.filter((r) => r.stage === "qc"), deliver: rows.filter((r) => r.stage === "approved") });
}
