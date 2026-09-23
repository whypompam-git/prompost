// A small localStorage-backed queue for task edits made with no signal —
// the flagship "field crew updates a status/assignee at a shoot with no
// bars" case. Not a general mutation queue for every action in the app;
// scoped deliberately to keep offline behavior predictable.

import type { Task } from "@/lib/types";
import { updateTaskRow } from "@/lib/supabase/queries";

const KEY = "prompost:offline-queue:tasks";

export type QueuedTaskEdit = {
  id: string;
  taskId: string;
  patch: Partial<Omit<Task, "id">>;
  createdAt: number;
};

function readQueue(): QueuedTaskEdit[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedTaskEdit[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // best-effort — losing the queue is better than crashing the app
  }
}

export function queueTaskEdit(taskId: string, patch: Partial<Omit<Task, "id">>) {
  const queue = readQueue();
  queue.push({ id: crypto.randomUUID(), taskId, patch, createdAt: Date.now() });
  writeQueue(queue);
}

export function pendingTaskEditCount(): number {
  return readQueue().length;
}

// Retries every queued edit in order; entries that still fail (e.g. still
// offline) stay queued for the next attempt.
export async function flushTaskEditQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;
  const remaining: QueuedTaskEdit[] = [];
  for (const entry of queue) {
    try {
      await updateTaskRow(entry.taskId, entry.patch);
    } catch (err) {
      console.error("Failed to sync queued task edit", err);
      remaining.push(entry);
    }
  }
  writeQueue(remaining);
}
