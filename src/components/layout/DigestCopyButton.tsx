"use client";

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { LineCopyBox } from "@/components/ui/LineCopyBox";

// "สรุปวันนี้": overdue payments, work due, leave — as a message to copy into the team's LINE.
export function DigestCopyButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function show() {
    setOpen(true);
    setText(null);
    setError("");
    const res = await fetch("/api/digest/text", { cache: "no-store" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) setText(data.text);
    else setError(data?.error ?? "สร้างสรุปไม่สำเร็จ");
  }

  return (
    <>
      <button onClick={show} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
        <ClipboardList size={14} className="text-emerald-600" /> สรุปวันนี้ → LINE
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <div className="w-full rounded-t-2xl bg-white p-5 pb-8 sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold text-gray-900">สรุปประจำวัน</p>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-400" aria-label="ปิด"><X size={18} /></button>
            </div>
            {text === null && !error && <p className="py-6 text-center text-sm text-gray-400">กำลังสร้างสรุป…</p>}
            {error && <p className="py-6 text-center text-sm text-rose-600">{error}</p>}
            {text !== null && <LineCopyBox label="วางในกลุ่ม LINE ของทีม" text={text} />}
          </div>
        </div>
      )}
    </>
  );
}
