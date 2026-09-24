"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TASK_SETTINGS } from "@/lib/taskSettings";
import { getTaskSettings } from "@/lib/supabase/queries";
import type { TaskSettings, TaskStatus } from "@/lib/types";

let cached: TaskSettings | null = null;
const listeners = new Set<(s: TaskSettings) => void>();

export function publishTaskSettings(s: TaskSettings) {
  cached = s;
  listeners.forEach((fn) => fn(s));
}

export function useTaskSettings() {
  const [settings, setSettings] = useState<TaskSettings>(cached ?? DEFAULT_TASK_SETTINGS);

  useEffect(() => {
    listeners.add(setSettings);
    if (!cached) getTaskSettings().then(publishTaskSettings).catch(() => {});
    return () => {
      listeners.delete(setSettings);
    };
  }, []);

  const typeOf = (key: string) => settings.types.find((t) => t.key === key);
  return {
    settings,
    types: settings.types,
    typeLabel: (key: string) => typeOf(key)?.label ?? key,
    typeColor: (key: string) => typeOf(key)?.color ?? "gray",
    statusColor: (s: TaskStatus) => settings.statusColors[s] ?? "gray",
  };
}
