"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { AgencySettings } from "@/lib/types";

export function AgencySettingsModal({
  initial,
  onClose,
  onSave,
}: {
  initial: AgencySettings;
  onClose: () => void;
  onSave: (values: AgencySettings) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone);
  const [taxId, setTaxId] = useState(initial.taxId);
  const [bankInfo, setBankInfo] = useState(initial.bankInfo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">ข้อมูลผู้เสนอราคา (แสดงบนเอกสาร)</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อ</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ที่อยู่</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เบอร์โทร</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เลขประจำตัวผู้เสียภาษี</span>
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">บัญชีธนาคาร (ค่าเริ่มต้นในเอกสาร)</span>
            <textarea
              value={bankInfo}
              onChange={(e) => setBankInfo(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={() => onSave({ name, address, phone, taxId, bankInfo })}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
