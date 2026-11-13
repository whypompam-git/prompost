import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller, taskForCaller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";
import { planNotifications, pushNotifications } from "@/lib/notify";
import { settle } from "@/lib/workflow";

export const dynamic = "force-dynamic";

// After the upload: record the new draft version and, if the clip was still in
// editing, hand it to QC (same hand-off as "ส่งงาน").
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  const { taskId, path, size } = await request.json().catch(() => ({}));
  if (!isUuid(taskId) || typeof path !== "string" || !path.startsWith("")) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const task = await taskForCaller(c, taskId);
  if (!task) return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
  if (!path.startsWith(`${task.client_id}/${task.id}/`)) return NextResponse.json({ error: "invalid path" }, { status: 400 });

  const db = createAdminClient();
  // the file must really be there
  const folder = path.slice(0, path.lastIndexOf("/"));
  const { data: files } = await db.storage.from("drafts").list(folder, { search: path.slice(path.lastIndexOf("/") + 1) });
  if (!files?.length) return NextResponse.json({ error: "ยังไม่พบไฟล์ที่อัปโหลด ลองใหม่" }, { status: 409 });

  const { data: last } = await db.from("task_drafts").select("version").eq("task_id", task.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: draft, error } = await db
    .from("task_drafts")
    .insert({ task_id: task.id, version: (last?.version ?? 0) + 1, path, size_bytes: typeof size === "number" ? size : null, uploaded_by: c.staffId })
    .select("id, version")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (task.type === "edit") {
    const next = settle({ type: "edit", status: "done", footageUrl: task.footage_url, revisionCount: task.revision_count ?? 0 });
    await db.from("tasks").update({ type: next.type, status: next.status, updated_at: new Date().toISOString() }).eq("id", task.id).eq("type", "edit");
    const { data: client } = await db.from("clients").select("name, manager_id").eq("id", task.client_id).maybeSingle();
    await pushNotifications(
      db,
      planNotifications({ kind: "handoff", taskTitle: task.title, clientName: client?.name ?? "", toStage: next.type }, { actorId: c.staffId, assigneeId: task.assignee_id, editorId: task.editor_id, managerId: client?.manager_id ?? null }),
      { taskId: task.id, clientId: task.client_id },
    );
  }
  return NextResponse.json({ ok: true, draft });
}
