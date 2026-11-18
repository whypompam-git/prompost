"use client";

import { CheckCircle2, Loader2, TriangleAlert, X } from "lucide-react";
import { dismissUpload, useUploads } from "@/lib/uploadManager";

// Floating list of draft uploads (all of them, with %), shown on every screen while any is running.
export function UploadBanner() {
  const uploads = useUploads();
  if (uploads.length === 0) return null;
  const running = uploads.filter((u) => u.status === "uploading").length;
  return (
    <div className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-md space-y-1.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl md:bottom-4 md:left-auto md:right-4">
      <p className="text-xs font-semibold text-gray-700">{running > 0 ? `กำลังอัปโหลดดราฟ ${running} ไฟล์ — อย่าปิดหน้านี้` : "อัปโหลดดราฟ"}</p>
      {uploads.map((u) => (
        <div key={u.taskId} className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            {u.status === "uploading" && <Loader2 size={13} className="shrink-0 animate-spin text-brand-500" />}
            {u.status === "done" && <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />}
            {u.status === "error" && <TriangleAlert size={13} className="shrink-0 text-rose-500" />}
            <span className="min-w-0 flex-1 truncate">{u.name}</span>
            <span className="shrink-0 font-semibold tabular-nums">{u.status === "done" ? "ส่งตรวจแล้ว" : u.status === "error" ? "ไม่สำเร็จ" : `${u.pct}%`}</span>
            {u.status !== "uploading" && (
              <button onClick={() => dismissUpload(u.taskId)} className="shrink-0 text-gray-400" aria-label="ปิด"><X size={13} /></button>
            )}
          </div>
          {u.status === "uploading" && (
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${u.pct}%` }} /></div>
          )}
          {u.status === "error" && <p className="text-[11px] text-rose-600">{u.error}</p>}
        </div>
      ))}
    </div>
  );
}
