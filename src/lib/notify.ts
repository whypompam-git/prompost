// Per-person notifications. planNotifications() is pure (and tested);
// pushNotifications() writes them with the service key. Notifications are only
// ever created on the server, from the route that handled the event.
import type { SupabaseClient } from "@supabase/supabase-js";
import { stageInfo } from "./workflow.ts";

export type NotifyKind =
  | "client_pass"
  | "client_revise"
  | "client_use"
  | "client_reject"
  | "qc_revise"
  | "handoff"
  | "assigned"
  | "overdue";

export type NotifyEvent = {
  kind: NotifyKind;
  taskTitle: string;
  clientName: string;
  toStage?: string; // for handoff
  brief?: string; // for revisions
  round?: number;
};

export type NotifyContext = {
  actorId?: string; // person who caused it (never notified about their own action)
  assigneeId?: string | null;
  managerId?: string | null;
  newAssigneeId?: string | null; // for "assigned"
};

export type PlannedNotification = { recipientId: string; kind: NotifyKind; title: string; body?: string };

const ellipsis = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function describeEvent(e: NotifyEvent): { title: string; body?: string } {
  const who = `${e.clientName} · ${e.taskTitle}`;
  switch (e.kind) {
    case "client_pass":
      return { title: `ลูกค้าอนุมัติแล้ว: ${who}`, body: "สถานะ ผ่าน — รอโพส" };
    case "client_revise":
      return { title: `ลูกค้าขอแก้ (รอบที่ ${e.round ?? 1}): ${who}`, body: e.brief ? ellipsis(e.brief) : undefined };
    case "client_use":
      return { title: `ลูกค้าเลือก "ใช้": ${who}`, body: "ไปขั้นตอนถ่ายทำได้เลย" };
    case "client_reject":
      return { title: `ลูกค้าเลือก "ไม่ใช้": ${who}` };
    case "qc_revise":
      return { title: `QC สั่งแก้ (รอบที่ ${e.round ?? 1}): ${who}`, body: e.brief ? ellipsis(e.brief) : undefined };
    case "handoff":
      return { title: `ส่งต่อไป ${stageInfo(e.toStage ?? "")?.label ?? e.toStage}: ${who}` };
    case "assigned":
      return { title: `คุณได้รับงานใหม่: ${who}` };
    case "overdue":
      return { title: `งานเลยกำหนด: ${who}` };
  }
}

export function planNotifications(e: NotifyEvent, c: NotifyContext): PlannedNotification[] {
  const recipients = new Set<string>();
  if (e.kind === "assigned") {
    if (c.newAssigneeId) recipients.add(c.newAssigneeId);
  } else {
    if (c.assigneeId) recipients.add(c.assigneeId);
    if (c.managerId) recipients.add(c.managerId);
  }
  if (c.actorId) recipients.delete(c.actorId);
  const { title, body } = describeEvent(e);
  return [...recipients].map((recipientId) => ({ recipientId, kind: e.kind, title, body }));
}

// An unread notification of the same kind for the same task is merged into
// one row with a counter instead of piling up.
export async function pushNotifications(
  db: SupabaseClient,
  items: PlannedNotification[],
  ref: { taskId?: string; clientId?: string },
): Promise<void> {
  for (const item of items) {
    let q = db
      .from("notifications")
      .select("id, count")
      .eq("recipient_id", item.recipientId)
      .eq("kind", item.kind)
      .is("read_at", null);
    q = ref.taskId ? q.eq("task_id", ref.taskId) : q.is("task_id", null);
    const { data: existing } = await q.limit(1).maybeSingle();
    if (existing) {
      await db
        .from("notifications")
        .update({ count: existing.count + 1, title: item.title, body: item.body ?? null, created_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await db.from("notifications").insert({
        recipient_id: item.recipientId,
        kind: item.kind,
        task_id: ref.taskId ?? null,
        client_id: ref.clientId ?? null,
        title: item.title,
        body: item.body ?? null,
      });
    }
  }
}
