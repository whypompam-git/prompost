"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { calcQuotationTotals } from "@/lib/accounting";
import type { Client, Invoice } from "@/lib/types";

export type ReceiptFormValues = { clientId: string; amount: number; issuedAt: string; invoiceId?: string };

const todayIso = () => new Date().toISOString().slice(0, 10);

export function ReceiptModal({
  clients,
  invoices,
  onClose,
  onSave,
}: {
  clients: Client[];
  invoices: Invoice[];
  onClose: () => void;
  onSave: (values: ReceiptFormValues) => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [invoiceId, setInvoiceId] = useState("");
  const [issuedAt, setIssuedAt] = useState(todayIso());

  const openInvoices = invoices.filter((i) => i.clientId === clientId && i.status === "unpaid");
  const canSave = clientId.length > 0 && amount > 0 && issuedAt.length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({ clientId, amount, issuedAt, invoiceId: invoiceId || undefined });
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
          <h3 className="text-base font-semibold text-gray-900">ออกใบเสร็จรับเงิน</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ลูกค้า</span>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setInvoiceId("");
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {openInvoices.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">รับชำระใบแจ้งหนี้ (ไม่บังคับ)</span>
              <select
                value={invoiceId}
                onChange={(e) => {
                  setInvoiceId(e.target.value);
                  const inv = openInvoices.find((i) => i.id === e.target.value);
                  if (inv) setAmount(calcQuotationTotals(inv.items, inv.vatPercent, inv.whtPercent).total);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">ไม่อ้างอิงใบแจ้งหนี้</option>
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNo} — ฿{calcQuotationTotals(i.items, i.vatPercent, i.whtPercent).total.toLocaleString("th-TH")}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">วันที่ในใบเสร็จ</span>
            <input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">จำนวนเงิน (บาท)</span>
            <input
              type="number"
              min={0}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
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
