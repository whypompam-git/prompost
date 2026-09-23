"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Staff } from "@/lib/types";

const AVATAR_COLORS = [
  "bg-orange-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
];

export type StaffFormValues = Omit<Staff, "id" | "avatarColor">;

export function StaffModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Staff;
  onClose: () => void;
  onSave: (values: StaffFormValues, avatarColor: string, pin?: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [hireDate, setHireDate] = useState(initial?.hireDate ?? "");
  const [baseSalary, setBaseSalary] = useState(initial?.baseSalary ?? 0);
  const [canViewAccounting, setCanViewAccounting] = useState(initial?.canViewAccounting ?? false);
  const [pin, setPin] = useState("");

  const isNew = !initial;
  const pinValid = pin === "" || /^\d{4}$/.test(pin);
  const canSave =
    name.trim().length > 0 &&
    position.trim().length > 0 &&
    pinValid &&
    (!isNew || /^\d{4}$/.test(pin));

  function handleSave() {
    if (!canSave) return;
    const avatarColor =
      initial?.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    onSave(
      {
        name: name.trim(),
        position: position.trim(),
        phone,
        email,
        hireDate,
        baseSalary,
        role: initial?.role ?? "staff",
        canViewAccounting,
        canViewHr: false,
      },
      avatarColor,
      pin || undefined,
    );
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
            {initial ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <Field label="ชื่อพนักงาน">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>
          <Field label="ตำแหน่ง">
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="เช่น Video Editor"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="เบอร์โทร">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </Field>
            <Field label="อีเมล">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่เริ่มงาน">
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </Field>
            <Field label="เงินเดือนพื้นฐาน (บาท)">
              <input
                type="number"
                min={0}
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
            <Field label={isNew ? "ตั้งรหัส PIN 4 หลักสำหรับเข้าระบบ" : "เปลี่ยนรหัส PIN (เว้นว่างถ้าไม่เปลี่ยน)"}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="เช่น 1234"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </Field>
            {!pinValid && <p className="text-xs text-rose-600">PIN ต้องเป็นตัวเลข 4 หลัก</p>}

            <p className="text-xs font-medium text-gray-500">สิทธิ์การเข้าถึงหน้า</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={canViewAccounting}
                onChange={(e) => setCanViewAccounting(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
              />
              ดูหน้าบัญชี (ยอดขาย/รายรับรายจ่าย)
            </label>
            <p className="text-xs text-gray-400">
              รายชื่อพนักงาน เงินเดือน และสิทธิ์การเข้าถึง ดูได้เฉพาะเจ้าของเท่านั้น
            </p>
          </div>
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
