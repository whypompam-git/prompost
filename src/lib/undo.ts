"use client";

// One "undo" for every change to a clip (stage, status, people, dates, links, revisions…).
// Every save through taskFlow remembers the OLD values of just the fields it changed; undo
// writes them back. Changes made within a second of each other (bulk edits) undo together.
// Not covered: deleting a clip (it asks first) and things already sent to people (LINE /
// bell notifications) — those stay sent.
import { updateTaskRow } from "@/lib/supabase/queries";
import type { Task } from "@/lib/types";

export type UndoEntry = { id: number; label: string; at: number; items: { taskId: string; before: Partial<Task> }[] };

const MAX = 20;
const GROUP_MS = 1000;
let stack: UndoEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const subscribeUndo = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const undoStack = () => stack;
export const lastUndo = () => stack[stack.length - 1] ?? null;

function describe(keys: string[], title: string): string {
  const has = (...k: string[]) => k.some((x) => keys.includes(x));
  const what = has("type") ? "เปลี่ยนขั้นตอน" : has("status") ? "เปลี่ยนสถานะ" : has("assigneeId", "editorId", "shotById") ? "เปลี่ยนผู้รับผิดชอบ" : has("scheduledDate", "dueDate", "editDate", "postDate") ? "เปลี่ยนวันที่" : has("finalUrl", "footageUrl", "refLink") ? "แก้ลิงก์" : "แก้ไขงาน";
  return title ? `${what}: ${title}` : what;
}

// `prev` is the clip before the change, `patch` the fields being saved.
export function rememberUndo(prev: Task, patch: Partial<Task>, label?: string) {
  const before: Record<string, unknown> = {};
  for (const k of Object.keys(patch) as (keyof Task)[]) {
    if (k === "id") continue;
    if (JSON.stringify(patch[k]) !== JSON.stringify(prev[k])) before[k] = prev[k] ?? null;
  }
  const keys = Object.keys(before);
  if (!keys.length) return;
  const now = Date.now();
  const last = stack[stack.length - 1];
  if (last && now - last.at < GROUP_MS && !label) {
    last.items.push({ taskId: prev.id, before: before as Partial<Task> });
    last.at = now;
    last.label = `แก้ไข ${last.items.length} งาน`;
  } else {
    stack.push({ id: ++seq, label: label ?? describe(keys, prev.title), at: now, items: [{ taskId: prev.id, before: before as Partial<Task> }] });
    if (stack.length > MAX) stack = stack.slice(-MAX);
  }
  emit();
}

export async function undoLast(): Promise<UndoEntry | null> {
  const e = stack[stack.length - 1];
  if (!e) return null;
  await Promise.all(e.items.map((i) => updateTaskRow(i.taskId, i.before)));
  stack = stack.filter((x) => x !== e);
  emit();
  return e;
}
