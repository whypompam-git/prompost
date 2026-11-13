import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";
import { applyClientAction, type ClientAction } from "@/lib/workflow";
import { planNotifications, pushNotifications, type NotifyKind } from "@/lib/notify";
import { alertTeamLine } from "@/lib/lineDigest";

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
  const { clientKey, taskId, action, brief, draftId, comments } = await request.json().catch(() => ({}));
  // comments pinned to seconds of the draft (client feed): [{ atSeconds, body }]
  const notes: { atSeconds: number | null; body: string }[] = Array.isArray(comments)
    ? comments
        .filter((c: unknown): c is { atSeconds?: unknown; body: string } => !!c && typeof (c as { body?: unknown }).body === "string" && (c as { body: string }).body.trim().length > 0)
        .slice(0, 50)
        .map((c) => ({ atSeconds: typeof c.atSeconds === "number" && c.atSeconds >= 0 && c.atSeconds < 36000 ? Math.round(c.atSeconds * 100) / 100 : null, body: c.body.trim().slice(0, 2000) }))
    : [];
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
  // the client's timed comments go straight to the editor's list
  if (action === "revise" && notes.length && task.type === "pending") {
    const draft = typeof draftId === "string" && isUuid(draftId) ? draftId : null;
    await db.from("draft_comments").insert(notes.map((n) => ({ task_id: task.id, draft_id: draft, from_client: true, at_seconds: n.atSeconds, body: n.body })));
  }
  // a client asking for changes also pings the team's LINE group, so someone can check the brief
  if (action === "revise") {
    const lines = notes.length ? notes.map((n) => `• ${n.body}`).join("\n") : (brief ?? "").trim();
    await alertTeamLine(
      db,
      `✏️ ลูกค้าสั่งแก้ ${task.type === "plan" ? "แผนคอนเทนต์" : "งาน"}\n${client.name} · ${task.title}\nรอบที่ ${result.revisionCount}\n${lines}`.slice(0, 4000),
    ).catch(() => 0);
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
