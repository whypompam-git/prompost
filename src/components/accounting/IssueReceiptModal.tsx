"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { calcQuotationTotals } from "@/lib/accounting";
import type { Client, Quotation, Transaction } from "@/lib/types";

export type IssueReceiptValues = {
  clientId: string;
  description: string;
  notes?: string;
};

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

// Issue a receipt for an income entry already in the books. Picking a
// quotation copies its item names into the receipt line, so the receipt,
// the quotation and the ledger entry all describe the same thing.
export function IssueReceiptModal({
  transaction,
  clients,
  quotations,
  onClose,
  onSave,
}: {
  transaction: Transaction;
  clients: Client[];
  quotations: Quotation[];
  onClose: () => void;
  onSave: (values: IssueReceiptValues) => Promise<void>;
}) {
  const guessedClient = useMemo(
    () =>
      clients.find((c) => `${transaction.description ?? ""} ${transaction.category}`.includes(c.name))?.id ??
      clients[0]?.id ??
      "",
    [clients, transaction],
  );
  const [clientId, setClientId] = useState(guessedClient);
  const [quotationId, setQuotationId] = useState("");
  const [description, setDescription] = useState(transaction.description ?? "");
  const [saving, setSaving] = useState(false);

  const clientQuotations = quotations.filter((q) => q.clientId === clientId);
  const quotation = quotations.find((q) => q.id === quotationId);

  function pickQuotation(id: string) {
    setQuotationId(id);
    const q = quotations.find((x) => x.id === id);
    if (q) setDescription(q.items.map((i) => i.description).join(" + "));
  }

  async function handleSave() {
    if (!clientId || !description.trim()) return;
    setSaving(true);
    try {
      await onSave({
        clientId,
        description: description.trim(),
        notes: quotation ? `อ้างอิงใบเสนอราคา ${quotation.quoteNo}` : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">ออกใบเสร็จ</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          จากรายการ {transaction.category} · ฿{currency(transaction.amount)} (ยอดและวันที่ใช้ตามรายการนี้)
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ลูกค้า</span>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setQuotationId("");
              }}
              className={field}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">อ้างอิงใบเสนอราคา (ไม่บังคับ)</span>
            <select value={quotationId} onChange={(e) => pickQuotation(e.target.value)} className={field}>
              <option value="">ไม่อ้างอิง</option>
              {clientQuotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteNo} — ฿{currency(calcQuotationTotals(q.items, q.vatPercent, q.whtPercent).total)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อรายการในใบเสร็จ</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !clientId || !description.trim()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
          >
            {saving ? "กำลังออก..." : "ออกใบเสร็จ"}
          </button>
        </div>
      </div>
    </div>
  );
}
