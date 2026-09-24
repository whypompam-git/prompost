"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { COLOR_STEMS, PALETTE } from "@/lib/colors";
import { ALL_PERMISSIONS, PERMISSION_KEYS, PERMISSION_LABELS, type Permissions } from "@/lib/permissions";
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
  const [permissions, setPermissions] = useState<Permissions>(
    initial?.permissions ?? { ...ALL_PERMISSIONS, accounting: false, documents: false, financialTotals: false, staffList: false, othersPayroll: false },
  );
  const [pin, setPin] = useState("");
  const [color, setColor] = useState(
    initial?.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  );

  const isNew = !initial;
  const pinValid = pin === "" || /^\d{4}$/.test(pin);
  const canSave =
    name.trim().length > 0 &&
    position.trim().length > 0 &&
    pinValid &&
    (!isNew || /^\d{4}$/.test(pin));

  function handleSave() {
    if (!canSave) return;
    const avatarColor = color;
    onSave(
      {
        name: name.trim(),
        position: position.trim(),
        phone,
        email,
        hireDate,
        baseSalary,
        role: initial?.role ?? "staff",
        permissions: initial?.role === "owner" ? ALL_PERMISSIONS : permissions,
      },
      avatarColor,
      pin || undefined,
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
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

          <Field label="สีประจำตัว (ใช้แสดงในตารางงาน)">
            <div className="flex flex-wrap gap-2">
              {COLOR_STEMS.map((stem) => {
                const cls = `bg-${stem}-500`;
                return (
                  <button
                    key={stem}
                    type="button"
                    onClick={() => setColor(cls)}
                    aria-label={PALETTE[stem].label}
                    className={`h-7 w-7 rounded-full ${PALETTE[stem].solid} ${
                      color === cls ? "ring-2 ring-gray-900 ring-offset-2" : ""
                    }`}
                  />
                );
              })}
            </div>
          </Field>

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

            <p className="text-xs font-medium text-gray-500">สิทธิ์การเข้าถึง</p>
            {initial?.role === "owner" ? (
              <p className="text-xs text-gray-400">เจ้าของมีสิทธิ์เข้าถึงทุกอย่างเสมอ</p>
            ) : (
              PERMISSION_KEYS.map((k) => (
                <label key={k} className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={permissions[k]}
                    onChange={(e) => setPermissions((p) => ({ ...p, [k]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
                  />
                  <span>
                    {PERMISSION_LABELS[k].label}
                    <span className="block text-xs text-gray-400">{PERMISSION_LABELS[k].hint}</span>
                  </span>
                </label>
              ))
            )}
            <p className="text-xs text-gray-400">
              การตั้งค่าพนักงาน (เพิ่ม/แก้ไข/ลบ) และตั้งค่าระบบ เป็นของเจ้าของเท่านั้น
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
