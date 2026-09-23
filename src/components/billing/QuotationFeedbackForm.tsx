"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { submitQuotationFeedback } from "@/lib/supabase/queries";

export function QuotationFeedbackForm({
  shareToken,
  initialFeedback,
}: {
  shareToken: string;
  initialFeedback?: string;
}) {
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!feedback.trim()) return;
    setSending(true);
    try {
      await submitQuotationFeedback(shareToken, feedback.trim());
      setSent(true);
    } catch (err) {
      console.error(err);
      window.alert("ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-[210mm] max-w-full px-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <MessageSquareText size={16} />
          ต้องการแก้ไข / มีคำถามเกี่ยวกับใบเสนอราคานี้?
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          placeholder="พิมพ์สิ่งที่ต้องการแก้ไขหรือสอบถามที่นี่..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-400">{sent && "ส่งแล้ว — ทางร้านจะติดต่อกลับไป"}</p>
          <button
            onClick={handleSubmit}
            disabled={sending || !feedback.trim()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {sending ? "กำลังส่ง..." : "ส่งข้อความ"}
          </button>
        </div>
      </div>
    </div>
  );
}
