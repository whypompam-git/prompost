import type { TaskSettings, TaskStatus } from "@/lib/types";
import { STAGES } from "@/lib/workflow";

export const DEFAULT_TASK_SETTINGS: TaskSettings = {
  types: STAGES.map((s) => ({ key: s.key, label: s.label, color: s.color })),
  statusColors: { todo: "gray", in_progress: "sky", review: "amber", done: "emerald", waiting: "violet" },
};

export const STATUS_KEYS: TaskStatus[] = ["todo", "in_progress", "review", "done", "waiting"];

export function mergeTaskSettings(row: Partial<TaskSettings> | null): TaskSettings {
  return {
    types: row?.types?.length ? row.types : DEFAULT_TASK_SETTINGS.types,
    statusColors: { ...DEFAULT_TASK_SETTINGS.statusColors, ...(row?.statusColors ?? {}) },
  };
}
