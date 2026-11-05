import type { ContractInstallment } from "./types.ts";

// Pure date / installment helpers for contracts. Dates are ISO "YYYY-MM-DD" (Bangkok calendar days).

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();

// same day N months later, clamped to the month's last day (31 Jan + 1 → 28/29 Feb)
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = (m - 1) + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, daysIn(ny, nm)))}`;
}

export function addDaysIso(iso: string, days: number): string {
  const t = new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

// a contract of N months starting on `start` ends the day before the same date N months later
export const termEndDate = (start: string, months: number) => addDaysIso(addMonths(start, months), -1);

// split `total` into parts that sum exactly to it (satang rounding goes to the last part)
function splitAmount(total: number, parts: number[]): number[] {
  const cents = Math.round(total * 100);
  const sum = parts.reduce((s, p) => s + p, 0) || 1;
  const out = parts.map((p) => Math.floor((cents * p) / sum));
  out[out.length - 1] += cents - out.reduce((s, c) => s + c, 0);
  return out.map((c) => c / 100);
}

// one installment per month, due on `start` + i months
export function monthlyInstallments(total: number, months: number, start: string): ContractInstallment[] {
  const n = Math.max(1, Math.floor(months));
  const amounts = splitAmount(total, Array(n).fill(1));
  const pct = Math.round((100 / n) * 100) / 100;
  return amounts.map((amount, i) => ({ label: `งวดที่ ${i + 1} (เดือนที่ ${i + 1})`, percent: pct, amount, due: start ? addMonths(start, i) : "" }));
}

export function depositInstallments(total: number, depositPercent: number, balanceDue: string): ContractInstallment[] {
  const p = Math.min(100, Math.max(0, depositPercent));
  const [dep, rest] = splitAmount(total, [p, 100 - p]);
  return [
    { label: "งวดที่ 1 (มัดจำ)", percent: p, amount: dep, due: "" },
    { label: "งวดที่ 2 (ส่วนที่เหลือ)", percent: 100 - p, amount: rest, due: balanceDue },
  ];
}
