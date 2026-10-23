"use client";

// Client-side glue between the staff UI and the pipeline rules: apply the
// automatic hand-offs before saving, and tell the server what happened so it
// can notify the right people.
import { updateTaskRow } from "@/lib/supabase/queries";
import type { Task } from "@/lib/types";
import { enterStage, settle } from "@/lib/workflow";

export type TaskEventName = "assigned" | "editor_assigned" | "stage_changed" | "qc_revise";

export async function notifyTaskEvent(
  taskId: string,
  event: TaskEventName,
  brief?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/tasks/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, event, brief }),
    });
    if (!res.ok) return { ok: false, error: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? String(res.status) };
    return { ok: true };
  } catch {
    return { ok: false, error: "network" };
  }
}

// `next` is the task as the person left it. Returns what was actually saved
// (the hand-off may have moved it on, e.g. edit Done -> QC In Review).
export async function saveTaskWithFlow(prev: Task, next: Task): Promise<Task> {
  const s = settle({ type: next.type, status: next.status, footageUrl: next.footageUrl, revisionCount: next.revisionCount });
  const saved: Task = { ...next, type: s.type, status: s.status };
  await updateTaskRow(saved.id, saved);
  announceChanges(prev, saved);
  return saved;
}

// For quick edits that only touch some fields (dashboard dropdowns, bulk bar).
export async function patchTaskWithFlow(prev: Task, fields: Partial<Task>): Promise<Task> {
  const patch = flowPatch(prev, fields);
  await updateTaskRow(prev.id, patch);
  const saved: Task = { ...prev, ...patch };
  announceChanges(prev, saved);
  return saved;
}

// The final field set to save for a quick edit: choosing a stage starts it at
// its default sub-status, and any change is run through the automatic
// hand-offs (e.g. a footage link on a finished shoot moves it to editing).
export function flowPatch(prev: Task, fields: Partial<Task>): Partial<Task> {
  const merged: Task = { ...prev, ...fields };
  const settled =
    fields.type !== undefined && fields.type !== prev.type && fields.status === undefined
      ? enterStage(merged.type, { footageUrl: merged.footageUrl, revisionCount: merged.revisionCount })
      : settle({ type: merged.type, status: merged.status, footageUrl: merged.footageUrl, revisionCount: merged.revisionCount });
  const out: Partial<Task> = { ...fields };
  if (settled.type !== prev.type) out.type = settled.type;
  if (settled.status !== prev.status || fields.status !== undefined || out.type !== undefined) out.status = settled.status;
  return out;
}

export function announceChanges(prev: Task | null, next: Task) {
  if (next.assigneeId && next.assigneeId !== prev?.assigneeId) void notifyTaskEvent(next.id, "assigned");
  if (next.editorId && next.editorId !== prev?.editorId) void notifyTaskEvent(next.id, "editor_assigned");
  if (prev && next.type !== prev.type) void notifyTaskEvent(next.id, "stage_changed");
}
