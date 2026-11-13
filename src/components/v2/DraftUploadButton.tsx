"use client";

import { useRef, useState } from "react";
import { Film, Upload } from "lucide-react";
import { uploadDraft } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

// Upload a draft video for a clip (editors). Goes straight to storage with a
// progress bar; a clip still in editing then moves on to QC by itself.
export function DraftUploadButton({ taskId, label = "อัปโหลดดราฟ", onDone, className }: { taskId: string; label?: string; onDone?: () => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);

  async function pick(file?: File) {
    if (!file) return;
    if (!window.confirm(`อัปโหลด "${file.name}" (${(file.size / 1048576).toFixed(0)} MB) เป็นดราฟให้ทีมตรวจ?`)) return;
    setPct(0);
    try {
      await uploadDraft(taskId, file, setPct);
      onDone?.();
      window.alert("อัปโหลดแล้ว ส่งให้ทีมตรวจเรียบร้อย");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setPct(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pct !== null}
        className={cn("relative flex items-center gap-1.5 overflow-hidden rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-90", className)}
      >
        {pct !== null && <span className="absolute inset-y-0 left-0 bg-brand-700/60" style={{ width: `${pct}%` }} />}
        <span className="relative flex items-center gap-1.5">
          {pct !== null ? <Film size={14} /> : <Upload size={14} />}
          {pct !== null ? `กำลังอัปโหลด ${pct}%` : label}
        </span>
      </button>
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.m4v,.webm" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </>
  );
}
