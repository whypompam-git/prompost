import type { TaskSettings, TaskStatus } from "@/lib/types";

export const DEFAULT_TASK_SETTINGS: TaskSettings = {
  types: [
    { key: "shoot", label: "ถ่ายทำ", color: "sky" },
    { key: "edit", label: "ตัดต่อ", color: "violet" },
    { key: "review", label: "ตรวจสอบ", color: "amber" },
    { key: "deliver", label: "ส่งมอบ", color: "emerald" },
    { key: "other", label: "อื่นๆ", color: "gray" },
  ],
  statusColors: { todo: "gray", in_progress: "sky", review: "amber", done: "emerald" },
};

export const STATUS_KEYS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export function mergeTaskSettings(row: Partial<TaskSettings> | null): TaskSettings {
  return {
    types: row?.types?.length ? row.types : DEFAULT_TASK_SETTINGS.types,
    statusColors: { ...DEFAULT_TASK_SETTINGS.statusColors, ...(row?.statusColors ?? {}) },
  };
}
