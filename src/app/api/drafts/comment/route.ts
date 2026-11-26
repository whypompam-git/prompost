import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller, taskForCaller } from "@/lib/draftsServer";
import { workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

// A team comment on a draft, optionally pinned to a second of the clip.
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });
  const { taskId, draftId, atSeconds, body } = await request.json().catch(() => ({}));
  if (!isUuid(taskId) || (draftId != null && !isUuid(draftId)) || typeof body !== "string" || !body.trim() || body.length > 2000) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const at = typeof atSeconds === "number" && atSeconds >= 0 && atSeconds < 36000 ? Math.round(atSeconds * 100) / 100 : null;
  const task = await taskForCaller(c, taskId);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data, error } = await workspaceDb(c.workspaceId)
    .from("draft_comments")
    .insert({ task_id: taskId, draft_id: draftId ?? null, author_staff_id: c.staffId, at_seconds: at, body: body.trim() })
    .select("id, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
}

// Sent back to the editor: the open team comments become the brief and are marked done.
export async function PATCH(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });
  const { taskId } = await request.json().catch(() => ({}));
  if (!isUuid(taskId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { error } = await workspaceDb(c.workspaceId)
    .from("draft_comments")
    .update({ resolved_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .eq("from_client", false)
    .is("resolved_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Delete a comment (team side). Any teammate can remove a comment on a clip they can open.
export async function DELETE(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!isUuid(id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = workspaceDb(c.workspaceId);
  const { data: row } = await db.from("draft_comments").select("id, task_id").eq("id", id).maybeSingle();
  if (!row || !(await taskForCaller(c, row.task_id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { error } = await db.from("draft_comments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
