import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";
import { applyClientAction, type ClientAction } from "@/lib/workflow";
import { planNotifications, pushNotifications, type NotifyKind } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ACTIONS = new Set<ClientAction>(["use", "revise", "reject", "pass"]);
const KIND: Record<ClientAction, NotifyKind> = {
  use: "client_use",
  revise: "client_revise",
  reject: "client_reject",
  pass: "client_pass",
};

// The client link's choices: Plan → ใช้ / แก้ / ไม่ใช้, Pending → ผ่าน / แก้.
// Needs an active link and a task that belongs to that client; the stage
// rules (and the revision counter) are enforced here, never in the browser.
export async function POST(request: Request) {
  const { clientKey, taskId, action, brief } = await request.json().catch(() => ({}));
  if (
    typeof clientKey !== "string" ||
    typeof taskId !== "string" ||
    typeof action !== "string" ||
    !ACTIONS.has(action as ClientAction) ||
    (brief !== undefined && (typeof brief !== "string" || brief.length > 4000))
  ) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id, name, manager_id, portal_enabled")
    .eq(isUuid(clientKey) ? "portal_token" : "slug", clientKey)
    .maybeSingle();
  if (!client || !client.portal_enabled) return NextResponse.json({ error: "link inactive" }, { status: 403 });

  const { data: task } = await db
    .from("tasks")
    .select("id, title, type, status, footage_url, revision_count, assignee_id, editor_id")
    .eq("id", taskId)
    .eq("client_id", client.id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  const result = applyClientAction(
    { type: task.type, status: task.status, revisionCount: task.revision_count },
    action as ClientAction,
    brief,
  );
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });

  // compare-and-set so a double click / stale page can't apply twice
  const patch: Record<string, unknown> = {
    type: result.type,
    status: result.status,
    revision_count: result.revisionCount,
    updated_at: new Date().toISOString(),
  };
  if (result.needsBrief) patch.revision_brief = brief!.trim();
  const { data: updated, error } = await db
    .from("tasks")
    .update(patch)
    .eq("id", task.id)
    .eq("type", task.type)
    .eq("status", task.status)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "task changed, refresh the page" }, { status: 409 });

  if (result.needsBrief) {
    await db.from("task_revisions").insert({ task_id: task.id, round: result.revisionCount, brief: brief!.trim(), source: "client" });
  }
  try {
    await pushNotifications(
      db,
      planNotifications(
        { kind: KIND[action as ClientAction], taskTitle: task.title, clientName: client.name, brief: brief?.trim(), round: result.revisionCount, toStage: result.type },
        { assigneeId: task.assignee_id, editorId: task.editor_id, managerId: client.manager_id },
      ),
      { taskId: task.id, clientId: client.id },
    );
  } catch (err) {
    console.error("notify failed", err); // the choice itself already went through
  }
  return NextResponse.json({ ok: true, type: result.type, status: result.status, revisionCount: result.revisionCount });
}
