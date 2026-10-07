"use client";

import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import type { Client } from "@/lib/types";

export type UploadQuotationValues = {
  clientId: string;
  quoteNo: string;
  issuedAt: string;
  amount: number;
  file: File;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

// Import an old quotation made outside the app (PDF or image) so it sits in
// the same list, filed under the right client.
export function UploadQuotationModal({
  clients,
  onClose,
  onSave,
}: {
  clients: Client[];
  onClose: () => void;
  onSave: (values: UploadQuotationValues) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [quoteNo, setQuoteNo] = useState("");
  const [issuedAt, setIssuedAt] = useState(todayIso());
  const [amount, setAmount] = useState(0);
  const [file, setFile] = useState<File | undefined>();
  const [saving, setSaving] = useState(false);

  const canSave = !!clientId && quoteNo.trim().length > 0 && !!file && !saving;

  async function handleSave() {
    if (!canSave || !file) return;
    setSaving(true);
    try {
      await onSave({ clientId, quoteNo: quoteNo.trim(), issuedAt, amount, file });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">อัปโหลดใบเสนอราคาเก่า</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ลูกค้า</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">เลขที่ใบเสนอราคา</span>
            <input value={quoteNo} onChange={(e) => setQuoteNo(e.target.value)} placeholder="เช่น QT2568-012" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">วันที่ในใบ</span>
              <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">ยอดรวม (บาท)</span>
              <input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className={field} />
            </label>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 hover:bg-gray-50"
          >
            <FileUp size={16} />
            <span className="truncate">{file?.name ?? "เลือกไฟล์ PDF หรือรูปภาพ"}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
          >
            {saving ? "กำลังอัปโหลด..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
