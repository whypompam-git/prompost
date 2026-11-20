import { isMine } from "@/lib/myWork";
import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { requireMe } from "@/lib/myWork";
import { workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

// The editor ticks a comment as fixed — only on their own clips.
export async function POST(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const { commentId } = await request.json().catch(() => ({}));
  if (!isUuid(commentId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = workspaceDb(me.workspaceId);
  const { data: c } = await db.from("draft_comments").select("id, task_id, tasks(editor_id, assignee_id)").eq("id", commentId).maybeSingle();
  const t = c ? ((Array.isArray(c.tasks) ? c.tasks[0] : c.tasks) as { editor_id: string | null; assignee_id: string | null } | null) : null;
  if (!c || !t || !isMine(t, me.staffId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.from("draft_comments").update({ editor_done_at: new Date().toISOString() }).eq("id", commentId).is("editor_done_at", null);
  return NextResponse.json({ ok: true });
}
