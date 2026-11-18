"use client";

import { useSyncExternalStore } from "react";
import { uploadDraft } from "@/lib/supabase/queries";

// Draft uploads live here, not inside a button: the upload keeps running (and its percentage
// stays visible) when the list re-sorts, a card moves to another tab, or the person changes page.
export type UploadState = { taskId: string; name: string; fileName: string; pct: number; status: "uploading" | "done" | "error"; error?: string };

let uploads: UploadState[] = [];
const listeners = new Set<() => void>();
const emit = () => {
  uploads = [...uploads];
  listeners.forEach((l) => l());
};
const set = (taskId: string, patch: Partial<UploadState>) => {
  const i = uploads.findIndex((u) => u.taskId === taskId);
  if (i >= 0) uploads[i] = { ...uploads[i], ...patch };
  emit();
};

export const isUploading = (taskId: string) => uploads.some((u) => u.taskId === taskId && u.status === "uploading");

// `title` is what the banner shows (client · clip). Resolves when the upload finished.
export async function startDraftUpload(taskId: string, file: File, title: string, onDone?: () => void): Promise<boolean> {
  if (isUploading(taskId)) return false;
  uploads = [...uploads.filter((u) => u.taskId !== taskId), { taskId, name: title, fileName: file.name, pct: 0, status: "uploading" }];
  emit();
  try {
    await uploadDraft(taskId, file, (pct) => set(taskId, { pct }));
    set(taskId, { pct: 100, status: "done" });
    onDone?.();
    setTimeout(() => dismissUpload(taskId), 8000);
    return true;
  } catch (err) {
    set(taskId, { status: "error", error: err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ" });
    return false;
  }
}

export function dismissUpload(taskId: string) {
  uploads = uploads.filter((u) => u.taskId !== taskId || u.status === "uploading");
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useUploads(): UploadState[] {
  return useSyncExternalStore(subscribe, () => uploads, () => []);
}
export function useUpload(taskId: string): UploadState | undefined {
  return useUploads().find((u) => u.taskId === taskId);
}

// leaving the page mid-upload would cancel it
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (uploads.some((u) => u.status === "uploading")) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
