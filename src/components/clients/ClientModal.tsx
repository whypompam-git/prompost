"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Client, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "ยังไม่ชำระ" },
  { value: "deposit", label: "มัดจำแล้ว" },
  { value: "paid", label: "ชำระครบแล้ว" },
];

const COLOR_OPTIONS = ["orange", "sky", "emerald", "violet", "rose", "amber"] as const;

const COLOR_SWATCH: Record<string, string> = {
  orange: "bg-orange-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
};

export type ClientFormValues = Omit<Client, "id" | "portalToken">;

export function ClientModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Client;
  onClose: () => void;
  onSave: (values: ClientFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initial?.paymentStatus ?? "unpaid",
  );
  const [colorTag, setColorTag] = useState(initial?.colorTag ?? "orange");

  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({ name: name.trim(), contactName, phone, paymentStatus, colorTag });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {initial ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="ชื่อลูกค้า / ร้าน">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Siam Coffee Co."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>

          <Field label="ชื่อผู้ติดต่อ">
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>

          <Field label="เบอร์โทร">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>

          <Field label="สถานะการชำระเงิน">
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="สีประจำลูกค้า (ใช้ในปฏิทิน)">
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColorTag(color)}
                  className={cn(
                    "h-7 w-7 rounded-full ring-offset-2 transition",
                    COLOR_SWATCH[color],
                    colorTag === color ? "ring-2 ring-gray-900" : "ring-0",
                  )}
                  aria-label={color}
                />
              ))}
            </div>
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}
