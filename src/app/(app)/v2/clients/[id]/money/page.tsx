"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { BalanceSummary } from "@/components/billing/BalanceSummary";
import { effectivePayments, looseBalance, quoteTotal, roundBalance, type Round } from "@/lib/billing";
import {
  listClientPackages,
  listContracts,
  listInvoices,
  listPackages,
  listQuotations,
  listReceipts,
  listTransactions,
} from "@/lib/supabase/queries";
import type { ClientPackage, Contract, Invoice, Package, Quotation, Receipt, Transaction } from "@/lib/types";
import { useV2Client } from "../useV2Client";

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

// New UI: one client's money — billed / paid / left (the same shared calculation
// as the client info page) and every document for this client in one list.
export default function V2ClientMoney() {
  const { id, client } = useV2Client();
  const [data, setData] = useState<{ rounds: ClientPackage[]; packages: Package[]; quotes: Quotation[]; invoices: Invoice[]; receipts: Receipt[]; txs: Transaction[]; contracts: Contract[] } | null>(null);

  useEffect(() => {
    Promise.all([
      listClientPackages(),
      listPackages(),
      listQuotations(),
      listInvoices(),
      listReceipts(),
      listTransactions().catch(() => [] as Transaction[]),
      listContracts().catch(() => [] as Contract[]),
    ]).then(([rounds, packages, quotes, invoices, receipts, txs, contracts]) =>
      setData({
        rounds: rounds.filter((r) => r.clientId === id),
        packages,
        quotes: quotes.filter((q) => q.clientId === id),
        invoices: invoices.filter((x) => x.clientId === id),
        receipts: receipts.filter((x) => x.clientId === id),
        txs: txs.filter((x) => x.clientId === id),
        contracts: contracts.filter((c) => c.clientId === id),
      }),
    );
  }, [id]);

  if (!data || !client) return (<><Topbar back={`/v2/clients/${id}`} title="บัญชี" /><LoadingView /></>);

  const quoteLite = data.quotes.map((q) => ({ id: q.id, clientId: q.clientId, clientPackageId: q.clientPackageId, status: q.status, createdAt: q.createdAt, items: q.items, vatPercent: q.vatPercent, whtPercent: q.whtPercent }));
  const rounds: Round[] = data.rounds.map((r) => ({ id: r.id, clientId: r.clientId, packageName: data.packages.find((p) => p.id === r.packageId)?.name, amount: r.amount, assignedAt: r.assignedAt }));
  const current = [...rounds].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))[0];
  const balance = current
    ? roundBalance(current, quoteLite, effectivePayments(rounds, data.receipts.map((r) => ({ id: r.id, clientId: r.clientId, clientPackageId: r.clientPackageId, amount: r.amount, createdAt: r.createdAt })), data.txs))
    : looseBalance(quoteLite, data.invoices, data.receipts, data.txs);

  const docs = [
    ...data.quotes.map((q) => ({ key: `q${q.id}`, kind: "ใบเสนอราคา", no: q.quoteNo, date: q.createdAt, amount: quoteTotal(q), href: `/print/quotation/${q.id}` })),
    ...data.invoices.map((x) => ({ key: `i${x.id}`, kind: "ใบแจ้งหนี้", no: x.invoiceNo, date: x.createdAt, amount: quoteTotal(x), href: `/print/invoice/${x.id}` })),
    ...data.receipts.map((x) => ({ key: `r${x.id}`, kind: "ใบเสร็จ", no: x.receiptNo, date: x.createdAt, amount: x.amount, href: `/print/receipt/${x.id}` })),
    ...data.contracts.map((c) => ({ key: `c${c.id}`, kind: "สัญญา", no: c.contractNo, date: c.createdAt, amount: c.totalAmount, href: `/contracts/${c.id}` })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Topbar back={`/v2/clients/${id}`} title="บัญชี" subtitle={client.name} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {current?.packageName && <p className="text-sm text-gray-600">แพ็กเกจรอบปัจจุบัน: <b>{current.packageName}</b></p>}
        <BalanceSummary {...balance} />
        <section className="rounded-2xl border border-gray-100 bg-white shadow-card">
          <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">เอกสารของลูกค้านี้</h2>
          <div className="divide-y divide-gray-100">
            {docs.map((d) => (
              <Link key={d.key} href={d.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800">{d.kind} {d.no}</span>
                  <span className="block text-xs text-gray-400">{day(d.date)}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-800">{baht(d.amount)}</span>
              </Link>
            ))}
            {docs.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-400">ยังไม่มีเอกสาร</p>}
          </div>
        </section>
        <p className="text-xs text-gray-400">ออกเอกสารใหม่ได้ที่เมนูเดิม “เอกสาร” (โปรไฟล์ → เมนูเดิม)</p>
      </div>
    </>
  );
}
