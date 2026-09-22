"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { FileText, Paperclip, Plus, Receipt as ReceiptIcon, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuotationModal, type QuotationFormValues } from "@/components/accounting/QuotationModal";
import { ReceiptModal, type ReceiptFormValues } from "@/components/accounting/ReceiptModal";
import { TransactionModal, type TransactionFormValues } from "@/components/accounting/TransactionModal";
import { calcQuotationTotals, nextQuoteNo, nextReceiptNo } from "@/lib/accounting";
import { mockClients, mockQuotations, mockReceipts, mockTransactions } from "@/lib/mock-data";
import type { Quotation, QuotationStatus, Receipt, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });

const QUOTE_STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "ร่าง",
  sent: "ส่งแล้ว",
  accepted: "ลูกค้ายอมรับ",
  rejected: "ลูกค้าปฏิเสธ",
};

const QUOTE_STATUS_STYLE: Record<QuotationStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-sky-100 text-sky-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

type Modal = "closed" | "quotation" | "receipt" | "transaction";

export default function AccountingPage() {
  const [quotations, setQuotations] = useState<Quotation[]>(mockQuotations);
  const [receipts, setReceipts] = useState<Receipt[]>(mockReceipts);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [modal, setModal] = useState<Modal>("closed");

  const clientName = (id: string) => mockClients.find((c) => c.id === id)?.name ?? "—";

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  function handleSaveQuotation(values: QuotationFormValues) {
    setQuotations((prev) => [
      {
        id: crypto.randomUUID(),
        quoteNo: nextQuoteNo(),
        status: "draft",
        createdAt: new Date().toISOString().slice(0, 10),
        ...values,
      },
      ...prev,
    ]);
    // TODO: persist via Supabase
    setModal("closed");
  }

  function handleSaveReceipt(values: ReceiptFormValues) {
    setReceipts((prev) => [
      { id: crypto.randomUUID(), receiptNo: nextReceiptNo(), createdAt: new Date().toISOString().slice(0, 10), ...values },
      ...prev,
    ]);
    // TODO: persist via Supabase
    setModal("closed");
  }

  function handleSaveTransaction(values: TransactionFormValues) {
    setTransactions((prev) => [{ id: crypto.randomUUID(), ...values }, ...prev]);
    // TODO: persist via Supabase + real file upload to Supabase Storage
    setModal("closed");
  }

  return (
    <>
      <Topbar title="บัญชี" subtitle="ใบเสนอราคา ใบเสร็จ และรายรับ-รายจ่าย" />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="รายรับรวม" value={`฿${currency(totalIncome)}`} icon={TrendingUp} tone="emerald" />
          <StatCard label="รายจ่ายรวม" value={`฿${currency(totalExpense)}`} icon={TrendingDown} tone="amber" />
          <StatCard label="กำไรสุทธิ" value={`฿${currency(totalIncome - totalExpense)}`} icon={Wallet} tone="orange" />
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <FileText size={16} />
              ใบเสนอราคา
            </h2>
            <button
              onClick={() => setModal("quotation")}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus size={16} />
              สร้างใบเสนอราคา
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">เลขที่</th>
                  <th className="px-5 py-3 font-medium">ลูกค้า</th>
                  <th className="px-5 py-3 font-medium">วันที่</th>
                  <th className="px-5 py-3 font-medium">ยอดสุทธิ</th>
                  <th className="px-5 py-3 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotations.map((q) => {
                  const totals = calcQuotationTotals(q.items, q.vatPercent, q.whtPercent);
                  return (
                    <tr key={q.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-medium text-gray-900">{q.quoteNo}</td>
                      <td className="px-5 py-3 text-gray-600">{clientName(q.clientId)}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {format(new Date(q.createdAt), "d MMM yyyy", { locale: th })}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">฿{currency(totals.total)}</td>
                      <td className="px-5 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", QUOTE_STATUS_STYLE[q.status])}>
                          {QUOTE_STATUS_LABEL[q.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">
                      ยังไม่มีใบเสนอราคา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <ReceiptIcon size={16} />
              ใบเสร็จรับเงิน
            </h2>
            <button
              onClick={() => setModal("receipt")}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus size={16} />
              ออกใบเสร็จ
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">เลขที่</th>
                  <th className="px-5 py-3 font-medium">ลูกค้า</th>
                  <th className="px-5 py-3 font-medium">วันที่</th>
                  <th className="px-5 py-3 font-medium">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.receiptNo}</td>
                    <td className="px-5 py-3 text-gray-600">{clientName(r.clientId)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {format(new Date(r.createdAt), "d MMM yyyy", { locale: th })}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">฿{currency(r.amount)}</td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">
                      ยังไม่มีใบเสร็จ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <Wallet size={16} />
              รายรับ-รายจ่าย
            </h2>
            <button
              onClick={() => setModal("transaction")}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus size={16} />
              บันทึกรายการ
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">วันที่</th>
                  <th className="px-5 py-3 font-medium">หมวดหมู่</th>
                  <th className="px-5 py-3 font-medium">รายละเอียด</th>
                  <th className="px-5 py-3 font-medium">สลิป</th>
                  <th className="px-5 py-3 font-medium text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 text-gray-600">
                      {format(new Date(t.occurredAt), "d MMM yyyy", { locale: th })}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{t.category}</td>
                    <td className="px-5 py-3 text-gray-500">{t.description ?? "—"}</td>
                    <td className="px-5 py-3">
                      {t.slipUrl ? (
                        <a
                          href={t.slipUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                        >
                          <Paperclip size={12} />
                          ดูสลิป
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-medium",
                        t.type === "income" ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {t.type === "income" ? "+" : "-"}฿{currency(t.amount)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Card className="text-sm text-gray-500">
          ตัวเลขทั้งหมดในหน้านี้ยังเก็บแค่ในหน้าเว็บ — ขั้นถัดไปคือเชื่อมข้อมูลจริงและอัปโหลดสลิปขึ้น Supabase Storage
        </Card>
      </div>

      {modal === "quotation" && (
        <QuotationModal clients={mockClients} onClose={() => setModal("closed")} onSave={handleSaveQuotation} />
      )}
      {modal === "receipt" && (
        <ReceiptModal clients={mockClients} onClose={() => setModal("closed")} onSave={handleSaveReceipt} />
      )}
      {modal === "transaction" && (
        <TransactionModal onClose={() => setModal("closed")} onSave={handleSaveTransaction} />
      )}
    </>
  );
}
