import { addDaysIso, depositInstallments, monthlyInstallments, termEndDate } from "./contractInstallments.ts";
import type { Contract, ContractKind, ContractTerms, ContractInstallment, PaymentMode } from "./types.ts";

// Pure: the next contract after `c` — same terms, starting the day after it ends.
export function renewalValues(c: Contract, today: string): {
  kind: ContractKind;
  clientId?: string;
  staffId?: string;
  signDate: string;
  startDate?: string;
  endDate?: string;
  packageName?: string;
  totalAmount: number;
  installments: ContractInstallment[];
  termMonths?: number;
  paymentMode?: PaymentMode;
  terms?: ContractTerms;
  clipCount?: number;
  pricePerClip?: number;
  renewedFrom: string;
} {
  const start = c.endDate && c.endDate >= today ? addDaysIso(c.endDate, 1) : today;
  const months = c.termMonths;
  const end = c.kind === "freelance" ? undefined : months ? termEndDate(start, months) : undefined;
  const total = c.totalAmount;
  let installments: ContractInstallment[];
  if (c.kind === "monthly" || c.paymentMode === "monthly") installments = monthlyInstallments(total, months ?? 1, start);
  else if (c.paymentMode === "deposit") installments = depositInstallments(total, c.installments[0]?.percent ?? 50, end ?? "");
  else installments = c.installments.map((i) => ({ ...i, amount: Math.round(total * i.percent) / 100, due: "" }));
  return {
    kind: c.kind,
    clientId: c.clientId,
    staffId: c.staffId,
    signDate: today,
    startDate: start,
    endDate: end,
    packageName: c.packageName,
    totalAmount: total,
    installments,
    termMonths: months,
    paymentMode: c.paymentMode,
    terms: c.terms,
    clipCount: c.clipCount,
    pricePerClip: c.pricePerClip,
    renewedFrom: c.id,
  };
}

// Pure: reminders for the owner as a contract nears its end (30 / 7 days, and the day itself).
export function expiryReminders(
  contracts: Pick<Contract, "id" | "kind" | "status" | "endDate" | "contractNo" | "parties" | "clientId">[],
  renewedIds: Set<string>,
  today: string,
): { contractId: string; clientId?: string; title: string }[] {
  const out: { contractId: string; clientId?: string; title: string }[] = [];
  for (const c of contracts) {
    if (c.status !== "signed" || !c.endDate || renewedIds.has(c.id)) continue;
    const left = Math.round((Date.parse(`${c.endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
    const stage = left < 0 ? null : left === 0 ? "หมดวันนี้" : left <= 7 ? "เหลือไม่เกิน 7 วัน" : left <= 30 ? "เหลือไม่เกิน 30 วัน" : null;
    if (!stage) continue;
    out.push({ contractId: c.id, clientId: c.clientId, title: `สัญญา ${c.contractNo} (${c.parties.client.name}) ${stage} — ต่อสัญญาไหม?` });
  }
  return out;
}
