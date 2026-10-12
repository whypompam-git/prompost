"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toInputDate } from "@/lib/docDate";

export type EditDocValues = { date: string; amount?: number; description?: string; notes?: string };

const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

// Fix a mistake on an issued invoice / receipt: the date printed in the
// header, and for receipts also the amount and the line item name.
export function EditDocModal({
  kind,
  docNo,
  createdAt,
  amount,
  description,
  notes,
  onClose,
  onSave,
}: {
  kind: "invoice" | "receipt";
  docNo: string;
  createdAt: string;
  amount?: number;
  description?: string;
  notes?: string;
  onClose: () => void;
  onSave: (values: EditDocValues) => Promise<void>;
}) {
  const [date, setDate] = useState(toInputDate(createdAt));
  const [amountValue, setAmountValue] = useState(amount ?? 0);
  const [desc, setDesc] = useState(description ?? "");
  const [noteValue, setNoteValue] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);
  const isReceipt = kind === "receipt";
  const canSave = !!date && (!isReceipt || amountValue > 0) && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(
        isReceipt
          ? { date, amount: amountValue, description: desc.trim() || undefined, notes: noteValue.trim() || undefined }
          : { date },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">แก้ไข{isReceipt ? "ใบเสร็จ" : "ใบแจ้งหนี้"} {docNo}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">วันที่ออกเอกสาร</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          {isReceipt && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">ยอดเงิน (บาท)</span>
                <input type="number" min={0} value={amountValue || ""} onChange={(e) => setAmountValue(Number(e.target.value))} className={field} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อรายการ</span>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="ชำระค่าบริการ" className={field} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">หมายเหตุ</span>
                <input value={noteValue} onChange={(e) => setNoteValue(e.target.value)} className={field} />
              </label>
              <p className="text-xs text-gray-400">แก้แล้วรายการรายรับในบัญชีที่ผูกกับใบเสร็จนี้จะอัปเดตตามด้วย</p>
            </>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={!canSave} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
