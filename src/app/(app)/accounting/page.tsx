"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronDown, Download, FilePlus2, FileText, Paperclip, Pencil, Plus, ReceiptText, Trash2, TrendingDown, TrendingUp, Upload, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { MonthRangeFilter } from "@/components/accounting/MonthRangeFilter";
import { QuotationModal, type QuotationFormValues } from "@/components/accounting/QuotationModal";
import { IssueReceiptModal, type IssueReceiptValues } from "@/components/accounting/IssueReceiptModal";
import { TransactionModal, type TransactionFormValues } from "@/components/accounting/TransactionModal";
import { useAuth } from "@/lib/auth/AuthContext";
import { downloadCsv } from "@/lib/exportCsv";
import {
  createInvoiceRow,
  createQuotationRow,
  createReceiptRow,
  createTransactionRow,
  deleteTransactionRow,
  listClientPackages,
  listClients,
  listPackages,
  listReceipts,
  listQuotations,
  listTransactions,
  updateTransactionRow,
  uploadSlip,
} from "@/lib/supabase/queries";
import { effectivePayments, roundBalance, suggestedInvoiceItems, suggestedQuoteItems, type Round } from "@/lib/billing";
import { InvoiceModal, type InvoiceFormValues } from "@/components/accounting/InvoiceModal";
import type { Client, ClientPackage, Package, Quotation, Receipt, Transaction } from "@/lib/types";
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
  const [quoting, setQuoting] = useState(false);
  const [quoteClient, setQuoteClient] = useState<string | undefined>();
  const [invoiceFor, setInvoiceFor] = useState<Transaction | null>(null);
  const [rounds, setRounds] = useState<ClientPackage[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [createdQuote, setCreatedQuote] = useState<{ id: string; no: string; kind: "quotation" | "invoice" } | null>(null);

  useEffect(() => {
    Promise.all([listTransactions(), listClients(), listQuotations(), listClientPackages().catch(() => [] as ClientPackage[]), listPackages().catch(() => [] as Package[]), listReceipts().catch(() => [] as Receipt[])])
      .then(([t, c, q, cp, pk, rc]) => {
        setRounds(cp);
        setPackages(pk);
        setReceipts(rc);
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
    const byClient = clientFilter ? filtered.filter((t) => t.clientId === clientFilter) : filtered;
    const key = (t: Transaction) => `${t.occurredAt}T${t.occurredTime ?? "00:00"}`;
    return [...byClient].sort((a, b) => (dateSort === "desc" ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b))));
  }, [transactions, monthFrom, monthTo, dateSort, clientFilter]);

  // ── billing: each client's current round, what is billed / paid / left ──
  const roundList: Round[] = useMemo(
    () => rounds.map((r) => ({ id: r.id, clientId: r.clientId, packageName: packages.find((p) => p.id === r.packageId)?.name, amount: r.amount, assignedAt: r.assignedAt })),
    [rounds, packages],
  );
  const quoteList = useMemo(() => quotations.map((q) => ({ id: q.id, clientId: q.clientId, clientPackageId: q.clientPackageId, status: q.status, createdAt: q.createdAt, items: q.items, vatPercent: q.vatPercent, whtPercent: q.whtPercent })), [quotations]);
  const payments = useMemo(
    () => effectivePayments(roundList, receipts.map((r) => ({ id: r.id, clientId: r.clientId, clientPackageId: r.clientPackageId, amount: r.amount, createdAt: r.createdAt })), transactions),
    [roundList, receipts, transactions],
  );
  const currentRound = (clientId?: string) => (clientId ? roundList.filter((r) => r.clientId === clientId).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))[0] : undefined);
  const balanceOf = (clientId?: string) => {
    const r = currentRound(clientId);
    return r ? { round: r, ...roundBalance(r, quoteList, payments) } : null;
  };
  const suggestQuote = (clientId: string) => {
    const r = currentRound(clientId);
    return { items: suggestedQuoteItems(r), clientPackageId: r?.id ?? null };
  };

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name;

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

  function exportVisible() {
    downloadCsv(
      `บัญชี ${monthFrom || "ทั้งหมด"}${monthTo && monthTo !== monthFrom ? `-${monthTo}` : ""}`,
      ["วันที่", "เวลา", "ประเภท", "ลูกค้า", "หมวดหมู่", "รายละเอียด", "จำนวนเงิน", "สลิป"],
      visible.map((t) => [
        t.occurredAt,
        t.occurredTime ?? "",
        t.type === "income" ? "รายรับ" : "รายจ่าย",
        clientName(t.clientId) ?? "",
        t.category,
        t.description ?? "",
        t.type === "income" ? t.amount : -t.amount,
        t.slipUrl ?? "",
      ]),
    );
  }

  async function handleCreateQuotation(v: QuotationFormValues) {
    try {
      const created = await createQuotationRow(v);
      setQuotations((prev) => [created, ...prev]);
      setCreatedQuote({ id: created.id, no: created.quoteNo, kind: "quotation" });
      setQuoting(false);
    } catch (err) {
      console.error(err);
      window.alert(`ออกใบเสนอราคาไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    }
  }

  async function handleCreateInvoice(v: InvoiceFormValues) {
    try {
      const created = await createInvoiceRow(v);
      setInvoiceFor(null);
      setCreatedQuote({ id: created.id, no: created.invoiceNo, kind: "invoice" });
    } catch (err) {
      console.error(err);
      window.alert(`ออกใบแจ้งหนี้ไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    }
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

        {createdQuote && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            <span>ออก{createdQuote.kind === "invoice" ? "ใบแจ้งหนี้" : "ใบเสนอราคา"} {createdQuote.no} แล้ว</span>
            <span className="flex items-center gap-3">
              <a href={`/print/${createdQuote.kind}/${createdQuote.id}`} target="_blank" rel="noreferrer" className="font-medium underline">
                เปิดดู / ดาวน์โหลด
              </a>
              <button onClick={() => setCreatedQuote(null)} className="text-emerald-500 hover:text-emerald-700">
                ปิด
              </button>
            </span>
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
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="max-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
              >
                <option value="">ทุกลูกค้า</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={exportVisible}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="ดาวน์โหลดรายการที่แสดงอยู่เป็นไฟล์ Excel (CSV)"
              >
                <Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  setQuoteClient(undefined);
                  setQuoting(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                <FileText size={16} />
                ออกใบเสนอราคา
              </button>
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
                  <th className="px-5 py-3 font-medium">ลูกค้า</th>
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
                    <td className="px-5 py-3 text-gray-700">
                      {t.clientId && clientName(t.clientId) ? (
                        <Link href={`/clients/${t.clientId}`} className="font-medium text-brand-700 hover:underline">
                          {clientName(t.clientId)}
                        </Link>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
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
                        {t.type === "income" && (
                          <button
                            onClick={() => {
                              setQuoteClient(t.clientId);
                              setQuoting(true);
                            }}
                            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50"
                            title="ออกใบเสนอราคา (เริ่มจากแพ็คเกจของลูกค้า เพิ่มรายการได้)"
                          >
                            <FileText size={13} />
                            ออกใบเสนอราคา
                          </button>
                        )}
                        {t.type === "income" && t.clientId && (balanceOf(t.clientId)?.outstanding ?? 0) > 0 && (
                          <button
                            onClick={() => setInvoiceFor(t)}
                            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50"
                            title={`ออกใบแจ้งหนี้ยอดคงเหลือ ฿${currency(balanceOf(t.clientId)!.outstanding)}`}
                          >
                            <FileText size={13} />
                            ใบแจ้งหนี้ยอดเหลือ ฿{currency(balanceOf(t.clientId)!.outstanding)}
                          </button>
                        )}
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
                    <td colSpan={7} className="px-5 py-6 text-center text-sm text-gray-400">
                      ไม่มีรายการในช่วงที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {quoting && (
        <QuotationModal
          clients={clients}
          prefill={quoteClient ? { clientId: quoteClient } : undefined}
          suggest={suggestQuote}
          onClose={() => {
            setQuoting(false);
            setQuoteClient(undefined);
          }}
          onSave={handleCreateQuotation}
        />
      )}
      {invoiceFor && invoiceFor.clientId && (() => {
        const b = balanceOf(invoiceFor.clientId);
        return (
          <InvoiceModal
            clients={clients}
            prefill={{ clientId: invoiceFor.clientId, items: suggestedInvoiceItems(b?.round, b?.outstanding ?? 0, b?.paid ?? 0), notes: b ? `ยอดแพ็คเกจ ฿${currency(b.billed)} · ชำระแล้ว ฿${currency(b.paid)}` : undefined }}
            onClose={() => setInvoiceFor(null)}
            onSave={handleCreateInvoice}
          />
        );
      })()}
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
          clients={clients}
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
