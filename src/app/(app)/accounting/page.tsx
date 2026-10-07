"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronDown, FilePlus2, Paperclip, Pencil, Plus, ReceiptText, Trash2, TrendingDown, TrendingUp, Upload, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { MonthRangeFilter } from "@/components/accounting/MonthRangeFilter";
import { IssueReceiptModal, type IssueReceiptValues } from "@/components/accounting/IssueReceiptModal";
import { TransactionModal, type TransactionFormValues } from "@/components/accounting/TransactionModal";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createReceiptRow,
  createTransactionRow,
  deleteTransactionRow,
  listClients,
  listQuotations,
  listTransactions,
  updateTransactionRow,
  uploadSlip,
} from "@/lib/supabase/queries";
import type { Client, Quotation, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function AccountingPage() {
  const auth = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "create" | { edit: Transaction }>("closed");
  const [monthFrom, setMonthFrom] = useState(thisMonth());
  const [monthTo, setMonthTo] = useState(thisMonth());
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [issuingFor, setIssuingFor] = useState<Transaction | null>(null);

  useEffect(() => {
    Promise.all([listTransactions(), listClients(), listQuotations()])
      .then(([t, c, q]) => {
        setTransactions(t);
        setClients(c);
        setQuotations(q);
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const filtered =
      !monthFrom && !monthTo
        ? transactions
        : transactions.filter((t) => {
            const m = t.occurredAt.slice(0, 7);
            return (!monthFrom || m >= monthFrom) && (!monthTo || m <= monthTo);
          });
    const key = (t: Transaction) => `${t.occurredAt}T${t.occurredTime ?? "00:00"}`;
    return [...filtered].sort((a, b) => (dateSort === "desc" ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b))));
  }, [transactions, monthFrom, monthTo, dateSort]);

  const totalIncome = visible.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = visible.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  async function handleSaveTransaction({ slipFile, keepSlip, ...values }: TransactionFormValues) {
    if (modalMode === "create") {
      const slipUrl = slipFile ? await uploadSlip(slipFile) : undefined;
      const created = await createTransactionRow({ ...values, slipUrl });
      setTransactions((prev) => [created, ...prev]);
    } else if (modalMode !== "closed") {
      const { edit } = modalMode;
      const slipUrl = slipFile ? await uploadSlip(slipFile) : keepSlip ? edit.slipUrl : undefined;
      await updateTransactionRow(edit.id, { ...values, slipUrl });
      setTransactions((prev) => prev.map((t) => (t.id === edit.id ? { ...t, ...values, slipUrl } : t)));
    }
    setModalMode("closed");
  }

  async function handleIssueReceipt(tx: Transaction, v: IssueReceiptValues) {
    try {
      const receipt = await createReceiptRow({
        clientId: v.clientId,
        amount: tx.amount,
        issuedAt: tx.occurredAt,
        description: v.description,
        notes: v.notes,
        transactionId: tx.id,
      });
      const client = clients.find((c) => c.id === v.clientId);
      setTransactions((prev) =>
        prev.map((x) =>
          x.id === tx.id
            ? {
                ...x,
                receiptId: receipt.id,
                description: `ใบเสร็จ ${receipt.receiptNo}${client ? ` — ${client.name}` : ""} · ${v.description}`,
              }
            : x,
        ),
      );
      setIssuingFor(null);
    } catch (err) {
      console.error(err);
      window.alert(`ออกใบเสร็จไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    }
  }

  async function handleQuickSlip(t: Transaction, file: File) {
    try {
      const slipUrl = await uploadSlip(file);
      await updateTransactionRow(t.id, { ...t, slipUrl });
      setTransactions((prev) => prev.map((x) => (x.id === t.id ? { ...x, slipUrl } : x)));
    } catch (err) {
      console.error(err);
      window.alert("แนบสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handleDeleteTransaction(t: Transaction) {
    if (!window.confirm(`ลบรายการ "${t.category}" ใช่ไหม?`)) return;
    setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    try {
      await deleteTransactionRow(t.id);
    } catch (err) {
      console.error(err);
      setTransactions((prev) => [t, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="บัญชี" subtitle="รายรับ-รายจ่าย" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="บัญชี" subtitle="รายรับ-รายจ่าย" />
      <div className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
        {auth.permissions.financialTotals && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
            <StatCard label="รายรับรวม" value={`฿${currency(totalIncome)}`} icon={TrendingUp} tone="emerald" />
            <StatCard label="รายจ่ายรวม" value={`฿${currency(totalExpense)}`} icon={TrendingDown} tone="amber" />
            <StatCard label="กำไรสุทธิ" value={`฿${currency(totalIncome - totalExpense)}`} icon={Wallet} tone="orange" />
          </div>
        )}

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <Wallet size={16} />
              รายรับ-รายจ่าย
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <MonthRangeFilter from={monthFrom} to={monthTo} onChange={(f, t) => { setMonthFrom(f); setMonthTo(t); }} />
              <button
                onClick={() => setModalMode("create")}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus size={16} />
                บันทึกรายการ
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="relative px-5 py-3 font-medium">
                    <button onClick={() => setDateMenuOpen((v) => !v)} className="flex items-center gap-1 hover:text-gray-600">
                      วันที่/เวลา
                      <ChevronDown size={12} className={dateMenuOpen ? "rotate-180" : ""} />
                    </button>
                    {dateMenuOpen && (
                      <div className="absolute left-3 top-10 z-20 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white text-sm normal-case tracking-normal shadow-xl">
                        {(
                          [
                            { value: "desc", label: "ใหม่ → เก่า" },
                            { value: "asc", label: "เก่า → ใหม่" },
                          ] as const
                        ).map((o) => (
                          <button
                            key={o.value}
                            onClick={() => {
                              setDateSort(o.value);
                              setDateMenuOpen(false);
                            }}
                            className={`block w-full px-4 py-2.5 text-left hover:bg-gray-50 ${dateSort === o.value ? "font-semibold text-brand-600" : "text-gray-700"}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="px-5 py-3 font-medium">หมวดหมู่</th>
                  <th className="px-5 py-3 font-medium">รายละเอียด</th>
                  <th className="px-5 py-3 font-medium">สลิป</th>
                  <th className="px-5 py-3 font-medium text-right">จำนวนเงิน</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 text-gray-600">
                      {format(new Date(t.occurredAt), "d MMM yyyy", { locale: th })}
                      {t.occurredTime && <span className="ml-1.5 text-xs text-gray-400">{t.occurredTime} น.</span>}
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
                        <SlipUploadButton onSelect={(file) => handleQuickSlip(t, file)} />
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
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t.receiptId ? (
                          <a
                            href={`/print/receipt/${t.receiptId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full p-1.5 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                            aria-label="ดูใบเสร็จ"
                            title="ดูใบเสร็จ"
                          >
                            <ReceiptText size={14} />
                          </a>
                        ) : (
                          t.type === "income" && (
                            <button
                              onClick={() => setIssuingFor(t)}
                              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                              title="ออกใบเสร็จ"
                            >
                              <FilePlus2 size={13} />
                              ออกใบเสร็จ
                            </button>
                          )
                        )}
                        <button
                          onClick={() => setModalMode({ edit: t })}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label="แก้ไขรายการ"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(t)}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="ลบรายการ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">
                      ไม่มีรายการในช่วงที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {issuingFor && (
        <IssueReceiptModal
          transaction={issuingFor}
          clients={clients}
          quotations={quotations}
          onClose={() => setIssuingFor(null)}
          onSave={(v) => handleIssueReceipt(issuingFor, v)}
        />
      )}
      {modalMode !== "closed" && (
        <TransactionModal
          initial={modalMode === "create" ? undefined : modalMode.edit}
          onClose={() => setModalMode("closed")}
          onSave={handleSaveTransaction}
        />
      )}
    </>
  );
}

// One click to attach a slip to a row that doesn't have one yet — no need
// to open the full edit modal just for this.
function SlipUploadButton({ onSelect }: { onSelect: (file: File) => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onSelect(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <label className="flex w-fit cursor-pointer items-center gap-1 text-xs text-gray-400 hover:text-brand-600">
      <Upload size={12} />
      {uploading ? "กำลังอัปโหลด..." : "แนบสลิป"}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={uploading} />
    </label>
  );
}
