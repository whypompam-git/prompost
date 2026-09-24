import type { Invoice, QuotationItem, Receipt } from "./types";

export function calcSubtotal(items: QuotationItem[]) {
  return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
}

export function calcQuotationTotals(
  items: QuotationItem[],
  vatPercent: number,
  whtPercent: number,
) {
  const subtotal = calcSubtotal(items);
  const vat = (subtotal * vatPercent) / 100;
  const wht = (subtotal * whtPercent) / 100;
  const total = subtotal + vat - wht;
  return { subtotal, vat, wht, total };
}

let quoteCounter = 1;
let receiptCounter = 14;

export function nextQuoteNo() {
  quoteCounter += 1;
  const year = new Date().getFullYear() + 543; // พ.ศ.
  return `QT${year}-${String(quoteCounter).padStart(3, "0")}`;
}

export function nextReceiptNo() {
  receiptCounter += 1;
  const year = new Date().getFullYear() + 543;
  return `RC${year}-${String(receiptCounter).padStart(3, "0")}`;
}

// What a client owes vs. has paid: invoices billed, receipts received.
export function clientBalance(
  invoices: Pick<Invoice, "items" | "vatPercent" | "whtPercent">[],
  receipts: Pick<Receipt, "amount">[],
) {
  const billed = invoices.reduce(
    (sum, i) => sum + calcQuotationTotals(i.items, i.vatPercent, i.whtPercent).total,
    0,
  );
  const paid = receipts.reduce((sum, r) => sum + r.amount, 0);
  return { billed, paid, outstanding: Math.max(billed - paid, 0) };
}
