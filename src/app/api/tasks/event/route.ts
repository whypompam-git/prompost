import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyQcRevision } from "@/lib/workflow";
import { planNotifications, pushNotifications } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Staff-side events that need a notification (or, for a QC revision, a state
// change the browser shouldn't do by itself). The recipients are worked out
// here from the database — the browser only says what happened to which task.
//   assigned      — the task's assignee was just set/changed
//   editor_assigned — the task's editor was just set/changed
//   stage_changed — the task moved to a new stage (hand-off)
//   qc_revise     — QC sends the clip back to the editor with a brief
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ error: "account disabled" }, { status: 401 });
  if (live.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });

  const { taskId, event, brief } = await request.json().catch(() => ({}));
  if (typeof taskId !== "string" || !["assigned", "editor_assigned", "stage_changed", "qc_revise"].includes(event)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (brief !== undefined && (typeof brief !== "string" || brief.length > 4000)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: task } = await db
    .from("tasks")
    .select("id, title, type, status, client_id, assignee_id, editor_id, revision_count, clients(name, manager_id)")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  const client = (Array.isArray(task.clients) ? task.clients[0] : task.clients) as { name: string; manager_id: string | null } | null;
  const ctx = { actorId: claims.staffId, assigneeId: task.assignee_id, editorId: task.editor_id, managerId: client?.manager_id ?? null };
  const names = { taskTitle: task.title, clientName: client?.name ?? "" };

  if (event === "qc_revise") {
    const result = applyQcRevision({ type: task.type, status: task.status, revisionCount: task.revision_count }, brief);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    const { data: updated, error } = await db
      .from("tasks")
      .update({
        type: result.type,
        status: result.status,
        revision_count: result.revisionCount,
        revision_brief: brief!.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("type", task.type)
      .eq("status", task.status)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!updated?.length) return NextResponse.json({ error: "task changed, refresh" }, { status: 409 });
    await db.from("task_revisions").insert({ task_id: task.id, round: result.revisionCount, brief: brief!.trim(), source: "qc" });
    await pushNotifications(
      db,
      planNotifications({ kind: "qc_revise", ...names, brief: brief!.trim(), round: result.revisionCount }, ctx),
      { taskId: task.id, clientId: task.client_id },
    );
    return NextResponse.json({ ok: true, type: result.type, status: result.status, revisionCount: result.revisionCount });
  }

  const planned =
    event === "assigned"
      ? planNotifications({ kind: "assigned", ...names }, { ...ctx, newAssigneeId: task.assignee_id })
      : event === "editor_assigned"
      ? planNotifications({ kind: "editor_assigned", ...names }, { ...ctx, newAssigneeId: task.editor_id })
      : planNotifications({ kind: "handoff", ...names, toStage: task.type }, ctx);
  await pushNotifications(db, planned, { taskId: task.id, clientId: task.client_id });
  return NextResponse.json({ ok: true });
}
