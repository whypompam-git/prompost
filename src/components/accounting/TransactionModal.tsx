"use client";

import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TransactionFormValues = {
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
  slipFile?: File;
  occurredAt: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export function TransactionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (values: TransactionFormValues) => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [slipFile, setSlipFile] = useState<File | undefined>();

  const canSave = category.trim().length > 0 && amount > 0;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
  }

  function handleSave() {
    if (!canSave) return;
    onSave({ type, category: category.trim(), amount, description: description.trim() || undefined, slipFile, occurredAt });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">บันทึกรายรับ-รายจ่าย</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition",
                  type === t ? "bg-brand-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                {t === "expense" ? "รายจ่าย" : "รายรับ"}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">หมวดหมู่</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="เช่น อุปกรณ์ถ่ายทำ, รับชำระค่างาน"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">จำนวนเงิน</span>
              <input
                type="number"
                min={0}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">วันที่</span>
              <input
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">รายละเอียด</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
            <Paperclip size={14} />
            {slipFile?.name ?? "แนบสลิปโอนเงิน"}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
