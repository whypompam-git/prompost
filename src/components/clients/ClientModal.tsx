"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Client, EntityType, Package, PaymentStatus } from "@/lib/types";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "ยังไม่ชำระ" },
  { value: "deposit", label: "มัดจำแล้ว" },
  { value: "paid", label: "ชำระครบแล้ว" },
  { value: "declined", label: "ปฏิเสธ" },
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

export type ClientFormValues = Omit<Client, "id" | "portalToken" | "portalEnabled" | "slug">;

export function ClientModal({
  initial,
  packages = [],
  onClose,
  onSave,
}: {
  initial?: Client;
  packages?: Package[];
  onClose: () => void;
  onSave: (values: ClientFormValues, packageId?: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [billingName, setBillingName] = useState(initial?.billingName ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initial?.paymentStatus ?? "unpaid",
  );
  const [colorTag, setColorTag] = useState(initial?.colorTag ?? "orange");
  const [entityType, setEntityType] = useState<EntityType>(initial?.entityType ?? "company");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [taxId, setTaxId] = useState(initial?.taxId ?? "");
  const [packageId, setPackageId] = useState("");

  const canSave = name.trim().length > 0;
  const taxIdLabel = entityType === "company" ? "เลขทะเบียนนิติบุคคล" : "เลขประจำตัวผู้เสียภาษี";

  function handleSave() {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      billingName: billingName.trim() || undefined,
      contactName,
      phone,
      paymentStatus,
      colorTag,
      entityType,
      address: address.trim() || undefined,
      taxId: taxId.trim() || undefined,
    }, packageId || undefined);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
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

        <div className="grid max-h-[68vh] grid-cols-1 gap-x-4 gap-y-3 overflow-y-auto pr-1 md:grid-cols-2">
          <Field label="ชื่อลูกค้า / ร้าน">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Siam Coffee Co."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>

          {!initial && packages.length > 0 && (
            <Field label="แพ็คเกจที่ลูกค้าซื้อ (ไม่บังคับ)" wide>
              <select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">ยังไม่เลือกแพ็คเกจ</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.clipCount > 0 ? ` (${p.clipCount} คลิป)` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                ถ้าแพ็คเกจมีจำนวนคลิป ระบบจะสร้างงานให้อัตโนมัติ ชื่อ "ชื่อลูกค้า-คลิป(ลำดับ)"
              </p>
            </Field>
          )}

          <Field label="ชื่อภาษาอังกฤษ (ใช้ทำลิงก์ลูกค้า)">
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="เช่น Gravita"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <p className="mt-1 break-all text-xs text-gray-400">
              ลิงก์: prompost.vercel.app/{slugify(nameEn) || "…"}
            </p>
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

          <Field label="ประเภทลูกค้า (สำหรับออกใบเสนอราคา)" wide>
            <div className="flex overflow-hidden rounded-lg border border-gray-200">
              {(
                [
                  { value: "company", label: "นิติบุคคล / บริษัท" },
                  { value: "individual", label: "บุคคลธรรมดา" },
                ] as { value: EntityType; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEntityType(opt.value)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition",
                    entityType === opt.value
                      ? "bg-brand-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="ชื่อสำหรับออกใบเสนอราคา (ชื่อบริษัท / ชื่อลูกค้า)" wide>
            <input
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              placeholder="เช่น บริษัท ทะพา ท่าอะไรก็รวย จำกัด"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>

          <Field label="ที่อยู่ (แสดงบนใบเสนอราคา/ใบเสร็จ)" wide>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>

          <Field label={taxIdLabel}>
            <input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
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

          <Field label="สีประจำลูกค้า (ใช้ในปฏิทิน)" wide>
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

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}
