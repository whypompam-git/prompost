import { calcQuotationTotals } from "./accounting.ts";
import type { Invoice, Quotation, Transaction } from "./types.ts";

export const monthKey = (iso: string) => iso.slice(0, 7);

// inclusive list of "YYYY-MM" between from and to
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function monthlyTotals(transactions: Transaction[], months: string[]) {
  const map = new Map(months.map((m) => [m, { income: 0, expense: 0 }]));
  for (const t of transactions) {
    const row = map.get(monthKey(t.occurredAt));
    if (!row) continue;
    if (t.type === "income") row.income += t.amount;
    else row.expense += t.amount;
  }
  return months.map((m) => ({ month: m, ...map.get(m)!, profit: map.get(m)!.income - map.get(m)!.expense }));
}

export function expenseByCategory(transactions: Transaction[], from: string, to: string) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    const m = monthKey(t.occurredAt);
    if (t.type !== "expense" || m < from || m > to) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export type WhtRow = {
  month: string;
  kind: "ใบแจ้งหนี้" | "ใบเสนอราคา (ลูกค้ายอมรับ)";
  no: string;
  clientId: string;
  subtotal: number;
  whtPercent: number;
  wht: number;
};

// Withholding tax the customer will hold back, from documents that carry a
// withholding %: every invoice, plus accepted quotations (which may not have
// an invoice yet). Both are listed so nothing is missed — check for overlap
// before filing.
export function withholdingRows(invoices: Invoice[], quotations: Quotation[], from: string, to: string): WhtRow[] {
  const rows: WhtRow[] = [];
  for (const i of invoices) {
    const t = calcQuotationTotals(i.items, i.vatPercent, i.whtPercent);
    if (i.whtPercent > 0) rows.push({ month: monthKey(i.createdAt), kind: "ใบแจ้งหนี้", no: i.invoiceNo, clientId: i.clientId, subtotal: t.subtotal, whtPercent: i.whtPercent, wht: t.wht });
  }
  for (const q of quotations) {
    if (q.status !== "accepted" || q.whtPercent <= 0) continue;
    const t = calcQuotationTotals(q.items, q.vatPercent, q.whtPercent);
    rows.push({ month: monthKey(q.createdAt), kind: "ใบเสนอราคา (ลูกค้ายอมรับ)", no: q.quoteNo, clientId: q.clientId, subtotal: t.subtotal, whtPercent: q.whtPercent, wht: t.wht });
  }
  return rows.filter((r) => r.month >= from && r.month <= to).sort((a, b) => a.month.localeCompare(b.month) || a.no.localeCompare(b.no));
}
