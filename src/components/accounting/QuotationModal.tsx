"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { calcQuotationTotals } from "@/lib/accounting";
import type { Client, QuotationItem } from "@/lib/types";

export type QuotationFormValues = {
  clientId: string;
  items: QuotationItem[];
  vatPercent: number;
  whtPercent: number;
};

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2 });
const emptyItem = (): QuotationItem => ({ description: "", qty: 1, unitPrice: 0 });

export function QuotationModal({
  clients,
  onClose,
  onSave,
}: {
  clients: Client[];
  onClose: () => void;
  onSave: (values: QuotationFormValues) => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [items, setItems] = useState<QuotationItem[]>([emptyItem()]);
  const [vatPercent, setVatPercent] = useState(7);
  const [whtPercent, setWhtPercent] = useState(0);

  const totals = calcQuotationTotals(items, vatPercent, whtPercent);
  const canSave =
    clientId.length > 0 && items.some((i) => i.description.trim().length > 0 && i.qty > 0);

  function updateItem(index: number, patch: Partial<QuotationItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      clientId,
      items: items.filter((i) => i.description.trim().length > 0),
      vatPercent,
      whtPercent,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">สร้างใบเสนอราคา</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ลูกค้า</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-gray-500">รายการ</span>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    placeholder="รายการ"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                    className="w-14 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                    className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <button
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="rounded-full p-1.5 text-gray-300 hover:bg-gray-100 hover:text-rose-500 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus size={13} />
              เพิ่มรายการ
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">VAT (%)</span>
              <input
                type="number"
                min={0}
                value={vatPercent}
                onChange={(e) => setVatPercent(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">หัก ณ ที่จ่าย (%)</span>
              <input
                type="number"
                min={0}
                value={whtPercent}
                onChange={(e) => setWhtPercent(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
          </div>

          <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>ยอดรวม</span>
              <span>{currency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT {vatPercent}%</span>
              <span>+{currency(totals.vat)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>หัก ณ ที่จ่าย {whtPercent}%</span>
              <span>-{currency(totals.wht)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900">
              <span>ยอดสุทธิ</span>
              <span>฿{currency(totals.total)}</span>
            </div>
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
