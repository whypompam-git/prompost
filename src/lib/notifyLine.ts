import type { WorkspaceDb } from "@/lib/supabase/workspaceDb";
import { editorLineText, planNotifications, pushNotifications, type NotifyContext, type NotifyEvent } from "@/lib/notify";
import { alertLine } from "@/lib/lineDigest";

// SERVER-ONLY: the in-app notifications for an event, plus the Editor LINE group(s)
// when the event is about editing work.
export async function notifyEvent(db: WorkspaceDb, e: NotifyEvent, ctx: NotifyContext, ref: { taskId?: string; clientId?: string }) {
  await pushNotifications(db, planNotifications(e, ctx), ref);
  await alertLine(db, "editor", editorLineText(e)).catch(() => 0);
}
