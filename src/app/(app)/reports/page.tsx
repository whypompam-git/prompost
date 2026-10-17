"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { MonthRangeFilter } from "@/components/accounting/MonthRangeFilter";
import { useAuth } from "@/lib/auth/AuthContext";
import { downloadCsv } from "@/lib/exportCsv";
import { expenseByCategory, monthKey, monthlyTotals, monthsBetween, withholdingRows } from "@/lib/reports";
import {
  listClientPackages,
  listClients,
  listInvoices,
  listQuotations,
  listReceipts,
  listTransactions,
} from "@/lib/supabase/queries";
import type { Client, ClientPackage, Invoice, Quotation, Receipt, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const monthLabel = (m: string) => `${THAI_MONTHS[Number(m.slice(5)) - 1]} ${String(Number(m.slice(0, 4)) + 543).slice(2)}`;

function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  return d.toISOString().slice(0, 7);
}

export default function ReportsPage() {
  const auth = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [rounds, setRounds] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    Promise.all([listTransactions(), listReceipts(), listClients(), listInvoices(), listQuotations(), listClientPackages()])
      .then(([t, r, c, i, q, cp]) => {
        setTransactions(t);
        setReceipts(r);
        setClients(c);
        setInvoices(i);
        setQuotations(q);
        setRounds(cp);
      })
      .catch((err) => {
        console.error(err);
        window.alert(`โหลดข้อมูลรายงานไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const range = from && to && from <= to ? { from, to } : null;
  const months = useMemo(() => (range ? monthsBetween(range.from, range.to).slice(-24) : []), [range]);
  const monthly = useMemo(() => monthlyTotals(transactions, months), [transactions, months]);
  const expenses = useMemo(() => (range ? expenseByCategory(transactions, range.from, range.to) : []), [transactions, range]);
  const wht = useMemo(() => (range ? withholdingRows(invoices, quotations, range.from, range.to) : []), [invoices, quotations, range]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const perClient = useMemo(() => {
    if (!range) return [];
    const currentRound = new Map<string, ClientPackage>();
    for (const r of rounds) if (!currentRound.has(r.clientId)) currentRound.set(r.clientId, r); // newest first
    return clients
      .map((c) => {
        const received = receipts
          .filter((r) => r.clientId === c.id && monthKey(r.createdAt) >= range.from && monthKey(r.createdAt) <= range.to)
          .reduce((s, r) => s + r.amount, 0);
        const round = currentRound.get(c.id);
        const paidOnRound = round ? receipts.filter((r) => r.clientPackageId === round.id).reduce((s, r) => s + r.amount, 0) : 0;
        return { id: c.id, name: c.name, received, outstanding: round ? Math.max(round.amount - paidOnRound, 0) : 0 };
      })
      .filter((c) => c.received > 0 || c.outstanding > 0)
      .sort((a, b) => b.received - a.received);
  }, [clients, receipts, rounds, range]);

  if (!auth.permissions.financialTotals && auth.role !== "owner") {
    return (
      <>
        <Topbar title="รายงาน" subtitle="" />
        <p className="p-6 text-sm text-gray-400">ไม่มีสิทธิ์ดูรายงานการเงิน — ติดต่อเจ้าของระบบ</p>
      </>
    );
  }
  if (loading) {
    return (
      <>
        <Topbar title="รายงาน" subtitle="สรุปรายรับ-รายจ่าย" />
        <LoadingView />
      </>
    );
  }

  const totalIncome = monthly.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthly.reduce((s, m) => s + m.expense, 0);
  const maxBar = Math.max(1, ...monthly.flatMap((m) => [m.income, m.expense]));
  const maxExpense = Math.max(1, ...expenses.map((e) => e.amount));
  const totalWht = wht.reduce((s, r) => s + r.wht, 0);

  function exportAll() {
    downloadCsv(
      `รายงาน ${from}-${to}`,
      ["เดือน", "รายรับ", "รายจ่าย", "กำไร"],
      monthly.map((m) => [m.month, m.income, m.expense, m.profit]),
    );
  }

  return (
    <>
      <Topbar title="รายงาน" subtitle="สรุปรายรับ-รายจ่าย ยอดลูกค้า และภาษีหัก ณ ที่จ่าย" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <button onClick={exportAll} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={15} />
            Export รายเดือน
          </button>
        </div>

        {!range ? (
          <Card className="text-sm text-gray-400">เลือกช่วงเดือนให้ครบทั้งต้นและปลายทาง</Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card><p className="text-xs text-gray-400">รายรับรวม</p><p className="text-xl font-semibold text-emerald-600">฿{currency(totalIncome)}</p></Card>
              <Card><p className="text-xs text-gray-400">รายจ่ายรวม</p><p className="text-xl font-semibold text-amber-600">฿{currency(totalExpense)}</p></Card>
              <Card><p className="text-xs text-gray-400">กำไรสุทธิ</p><p className={cn("text-xl font-semibold", totalIncome - totalExpense >= 0 ? "text-gray-900" : "text-rose-600")}>฿{currency(totalIncome - totalExpense)}</p></Card>
            </div>

            <Card className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">รายรับ-รายจ่ายรายเดือน</p>
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-end gap-3 pb-1" style={{ height: 190 }}>
                  {monthly.map((m) => (
                    <div key={m.month} className="flex w-14 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
                      <div className="flex w-full flex-1 items-end justify-center gap-1">
                        <div className="w-5 rounded-t bg-emerald-400" style={{ height: `${(m.income / maxBar) * 100}%`, minHeight: m.income ? 2 : 0 }} title={`รายรับ ฿${currency(m.income)}`} />
                        <div className="w-5 rounded-t bg-amber-400" style={{ height: `${(m.expense / maxBar) * 100}%`, minHeight: m.expense ? 2 : 0 }} title={`รายจ่าย ฿${currency(m.expense)}`} />
                      </div>
                      <span className="text-[10px] text-gray-500">{monthLabel(m.month)}</span>
                      <span className={cn("text-[10px] font-medium", m.profit >= 0 ? "text-gray-700" : "text-rose-500")}>{m.profit >= 0 ? "+" : ""}{currency(m.profit)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />รายรับ</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />รายจ่าย</span>
                <span>ตัวเลขใต้เดือน = กำไร</span>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">รายจ่ายแยกหมวด</p>
                {expenses.length === 0 && <p className="text-sm text-gray-400">ไม่มีรายจ่ายในช่วงนี้</p>}
                {expenses.map((e) => (
                  <div key={e.category}>
                    <div className="flex justify-between text-sm"><span className="truncate text-gray-700">{e.category}</span><span className="shrink-0 text-gray-900">฿{currency(e.amount)}</span></div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(e.amount / maxExpense) * 100}%` }} /></div>
                  </div>
                ))}
              </Card>

              <Card className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">ยอดต่อลูกค้า</p>
                {perClient.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีข้อมูลในช่วงนี้</p>}
                <div className="divide-y divide-gray-50">
                  {perClient.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate text-gray-800">{c.name}</span>
                      <span className="shrink-0 text-right">
                        <span className="font-medium text-emerald-600">฿{currency(c.received)}</span>
                        {c.outstanding > 0 && <span className="ml-2 text-xs text-rose-500">ค้าง ฿{currency(c.outstanding)}</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">ยอดที่ได้รับ = ใบเสร็จในช่วงที่เลือก · ค้างชำระ = รอบแพ็คเกจปัจจุบัน</p>
              </Card>
            </div>

            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">ภาษีหัก ณ ที่จ่าย (จากเอกสารที่ระบุ %)</p>
                <button
                  onClick={() => downloadCsv(`หัก ณ ที่จ่าย ${from}-${to}`, ["เดือน", "ประเภท", "เลขที่", "ลูกค้า", "ยอดก่อนภาษี", "% หัก", "ภาษีหัก"], wht.map((r) => [r.month, r.kind, r.no, clientName(r.clientId), r.subtotal, r.whtPercent, r.wht]))}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  <Download size={12} />
                  Export
                </button>
              </div>
              {wht.length === 0 ? (
                <p className="text-sm text-gray-400">ไม่มีเอกสารที่ระบุหัก ณ ที่จ่ายในช่วงนี้</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead><tr className="border-b border-gray-100 text-xs text-gray-400"><th className="py-2 font-medium">เดือน</th><th className="font-medium">เอกสาร</th><th className="font-medium">ลูกค้า</th><th className="text-right font-medium">ก่อนภาษี</th><th className="text-right font-medium">หัก</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {wht.map((r) => (
                        <tr key={`${r.kind}${r.no}`}>
                          <td className="py-2 text-gray-500">{monthLabel(r.month)}</td>
                          <td className="text-gray-800">{r.no} <span className="text-xs text-gray-400">{r.kind}</span></td>
                          <td className="text-gray-600">{clientName(r.clientId)}</td>
                          <td className="text-right text-gray-600">฿{currency(r.subtotal)}</td>
                          <td className="text-right font-medium text-gray-900">฿{currency(r.wht)} <span className="text-xs text-gray-400">({r.whtPercent}%)</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-gray-200"><td colSpan={4} className="py-2 text-right font-medium text-gray-700">รวมภาษีหัก ณ ที่จ่าย</td><td className="text-right font-semibold text-gray-900">฿{currency(totalWht)}</td></tr></tfoot>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-400">ใบแจ้งหนี้ทุกใบที่ระบุ % หัก + ใบเสนอราคาที่ลูกค้ายอมรับ ถ้าเอกสารเดียวกันออกทั้งสองแบบจะนับซ้ำ — ตรวจก่อนนำไปยื่นภาษี</p>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
