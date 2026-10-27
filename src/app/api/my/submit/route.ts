import { NextResponse, type NextRequest } from "next/server";
import { planNotifications, pushNotifications } from "@/lib/notify";
import { isUuid } from "@/lib/aiApi";
import { requireMe } from "@/lib/myWork";
import { createAdminClient } from "@/lib/supabase/admin";
import { settle } from "@/lib/workflow";

export const dynamic = "force-dynamic";

// The editor hands a finished edit in: edit Done → QC In Review, and the
// responsible person is told to review it. Only the editor of that clip can do
// this, and only while it is in the editing stage.
export async function POST(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const { taskId } = await request.json().catch(() => ({}));
  if (!isUuid(taskId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const db = createAdminClient();
  const { data: task } = await db
    .from("tasks")
    .select("id, title, type, status, client_id, assignee_id, editor_id, footage_url, revision_count, clients(name, manager_id)")
    .eq("id", taskId)
    .eq("editor_id", me.staffId)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "ไม่พบงานนี้ในงานของคุณ" }, { status: 404 });
  if (task.type !== "edit") return NextResponse.json({ error: "งานนี้ไม่ได้อยู่ในขั้นตัดต่อแล้ว" }, { status: 409 });

  const next = settle({ type: "edit", status: "done", footageUrl: task.footage_url, revisionCount: task.revision_count ?? 0 });
  const { data: updated, error } = await db
    .from("tasks")
    .update({ type: next.type, status: next.status, updated_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("type", "edit")
    .eq("editor_id", me.staffId)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "งานเปลี่ยนไปแล้ว รีเฟรชหน้านี้" }, { status: 409 });

  const client = (Array.isArray(task.clients) ? task.clients[0] : task.clients) as { name: string; manager_id: string | null } | null;
  try {
    await pushNotifications(
      db,
      planNotifications(
        { kind: "handoff", taskTitle: task.title, clientName: client?.name ?? "", toStage: next.type },
        { actorId: me.staffId, assigneeId: task.assignee_id, editorId: task.editor_id, managerId: client?.manager_id ?? null },
      ),
      { taskId: task.id, clientId: task.client_id },
    );
  } catch (err) {
    console.error("notify failed", err);
  }
  return NextResponse.json({ ok: true, type: next.type, status: next.status });
}
