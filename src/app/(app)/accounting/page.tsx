"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Paperclip, Pencil, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { MonthRangeFilter } from "@/components/accounting/MonthRangeFilter";
import { TransactionModal, type TransactionFormValues } from "@/components/accounting/TransactionModal";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createTransactionRow,
  deleteTransactionRow,
  listTransactions,
  updateTransactionRow,
  uploadSlip,
} from "@/lib/supabase/queries";
import type { Transaction } from "@/lib/types";
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

  useEffect(() => {
    listTransactions()
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (!monthFrom && !monthTo) return transactions;
    return transactions.filter((t) => {
      const m = t.occurredAt.slice(0, 7);
      return (!monthFrom || m >= monthFrom) && (!monthTo || m <= monthTo);
    });
  }, [transactions, monthFrom, monthTo]);

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
                  <th className="px-5 py-3 font-medium">วันที่</th>
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
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
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
