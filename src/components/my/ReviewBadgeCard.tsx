"use client";

import { useEffect, useState } from "react";
import { readReviewMode, saveReviewMode, type ReviewBadgeMode } from "@/lib/reviewBadge";
import { cn } from "@/lib/utils";

// Profile setting: what the number on the "ตรวจดราฟ" menu counts.
export function ReviewBadgeCard() {
  const [mode, setMode] = useState<ReviewBadgeMode>("mine");
  useEffect(() => setMode(readReviewMode()), []);
  const pick = (m: ReviewBadgeMode) => {
    setMode(m);
    saveReviewMode(m);
  };
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <p className="text-sm font-semibold text-gray-800">ตัวเลขแจ้งเตือน “ตรวจดราฟ”</p>
      <p className="mb-2 text-xs text-gray-400">จะให้นับงานรอตรวจแบบไหน (ตั้งไว้ที่เครื่องนี้)</p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
        {([["mine", "เฉพาะงานของฉัน"], ["all", "งานทั้งหมด"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => pick(k)} className={cn("rounded-md py-2", mode === k ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}>{label}</button>
        ))}
      </div>
    </div>
  );
}
