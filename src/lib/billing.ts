// One place that decides "how much is billed, how much has been paid, how much
// is left" for a client's billing round, so the client page, the clients list,
// the accounting buttons and the overdue alerts all agree.
//
//  billed  = the round's quotation (latest one not rejected, linked to the round)
//            — or, with no quotation, the package price of the round
//  paid    = receipts of the round + money received that has no receipt yet
//            (an income ledger entry with a client), so a deposit counts the
//            moment it is booked, not only after its receipt is issued
//  left    = billed − paid   (what the follow-up invoice should ask for)
import { calcQuotationTotals } from "./accounting.ts";
import type { QuotationItem } from "./types.ts";

export type Round = { id: string; clientId: string; packageName?: string; amount: number; assignedAt: string };
export type QuoteLite = {
  id: string;
  clientId: string;
  clientPackageId?: string | null;
  status: string;
  createdAt: string;
  items: QuotationItem[];
  vatPercent: number;
  whtPercent: number;
};
export type ReceiptLite = { id: string; clientId: string; clientPackageId?: string | null; amount: number; createdAt: string };
export type TxLite = { id: string; type: string; clientId?: string | null; receiptId?: string | null; amount: number; occurredAt: string };
export type Payment = { clientId: string; roundId: string | null; amount: number; date: string };

const day = (iso: string) => iso.slice(0, 10);

export function quoteTotal(q: Pick<QuoteLite, "items" | "vatPercent" | "whtPercent">) {
  return calcQuotationTotals(q.items, q.vatPercent, q.whtPercent).total;
}

export function roundBilled(round: Round, quotes: QuoteLite[]): number {
  const mine = quotes
    .filter((q) => q.clientPackageId === round.id && q.status !== "rejected")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return mine.length > 0 ? quoteTotal(mine[0]) : round.amount;
}

// the round a payment on `date` belongs to: the client's newest round that had started by then
export function roundFor(rounds: Round[], clientId: string, date: string): string | null {
  const mine = rounds.filter((r) => r.clientId === clientId).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  if (mine.length === 0) return null;
  return (mine.find((r) => day(r.assignedAt) <= day(date)) ?? mine[mine.length - 1]).id;
}

// every payment received, once: receipts (their own round, or the one the date falls in)
// plus income ledger entries that have a client but no receipt
export function effectivePayments(rounds: Round[], receipts: ReceiptLite[], transactions: TxLite[]): Payment[] {
  const out: Payment[] = receipts.map((r) => ({
    clientId: r.clientId,
    roundId: r.clientPackageId ?? roundFor(rounds, r.clientId, r.createdAt),
    amount: r.amount,
    date: r.createdAt,
  }));
  for (const t of transactions) {
    if (t.type !== "income" || !t.clientId || t.receiptId) continue;
    out.push({ clientId: t.clientId, roundId: roundFor(rounds, t.clientId, t.occurredAt), amount: t.amount, date: t.occurredAt });
  }
  return out;
}

export function roundBalance(round: Round, quotes: QuoteLite[], payments: Payment[]) {
  const billed = roundBilled(round, quotes);
  const paid = payments.filter((p) => p.roundId === round.id).reduce((s, p) => s + p.amount, 0);
  return { billed, paid, outstanding: Math.max(billed - paid, 0) };
}

// Starting items for a new quotation: the client's package (editable, add extras)
export function suggestedQuoteItems(round: Round | undefined): QuotationItem[] {
  return round ? [{ description: round.packageName || "แพ็คเกจ", qty: 1, unitPrice: round.amount }] : [];
}

// Starting items for the follow-up invoice: what is left after what was paid
export function suggestedInvoiceItems(round: Round | undefined, outstanding: number, paid: number): QuotationItem[] {
  if (!round || outstanding <= 0) return [];
  const label = paid > 0 ? `ยอดคงเหลือ ${round.packageName || "แพ็คเกจ"} (หลังชำระแล้ว ${paid.toLocaleString("th-TH")} บาท)` : round.packageName || "แพ็คเกจ";
  return [{ description: label, qty: 1, unitPrice: outstanding }];
}

// Feed for the overdue-payment alerts (bell + LINE digest): each round's amount
// is what is billed for it, and every payment — receipt or unreceipted deposit —
// is attached to its round, so they never nag about money that has been received.
export function alertBilling(rounds: Round[], quotes: QuoteLite[], receipts: ReceiptLite[], transactions: TxLite[]) {
  return {
    rounds: rounds.map((r) => ({ ...r, packageName: r.packageName ?? "", amount: roundBilled(r, quotes) })),
    receipts: effectivePayments(rounds, receipts, transactions).map((p) => ({ clientPackageId: p.roundId ?? undefined, amount: p.amount })),
  };
}
