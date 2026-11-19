import { NextResponse, type NextRequest } from "next/server";
import { caller } from "@/lib/draftsServer";
import { workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

// Small read for the menu numbers and the dots on the client icons. It uses the SAME rule as the
// review feed (QC + In Review with an uploaded draft; approved without a final file yet), so the
// number on the menu always matches what the page shows. `revise` = clips being re-edited after
// a revision request.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ review: [], deliver: [], revise: [] });
  const db = workspaceDb(c.workspaceId);
  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, type, client_id, editor_id, assignee_id, revision_count")
    .or("and(type.eq.qc,status.eq.review),and(type.eq.approved,final_url.is.null),and(type.eq.edit,revision_count.gt.0,status.neq.done)")
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = tasks ?? [];
  const needDraft = rows.filter((t) => t.type !== "edit").map((t) => t.id);
  const withDraft = new Set<string>();
  if (needDraft.length) {
    const { data: drafts } = await db.from("task_drafts").select("task_id").in("task_id", needDraft).is("removed_at", null);
    for (const d of drafts ?? []) withDraft.add(d.task_id as string);
  }
  const pick = (t: (typeof rows)[number]) => ({
    id: t.id as string,
    clientId: t.client_id as string,
    editorId: (t.editor_id as string | null) ?? null,
    assigneeId: (t.assignee_id as string | null) ?? null,
  });
  return NextResponse.json({
    review: rows.filter((t) => t.type === "qc" && withDraft.has(t.id)).map(pick),
    deliver: rows.filter((t) => t.type === "approved" && withDraft.has(t.id)).map(pick),
    revise: rows.filter((t) => t.type === "edit").map(pick),
  });
}
