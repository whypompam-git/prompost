import { addDays, buildDigest, bangkokDay, digestToText, filterDigest } from "@/lib/alerts";
import { alertBilling } from "@/lib/billing";
import { calcQuotationTotals } from "@/lib/accounting";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuotationItem } from "@/lib/types";

const GRACE_DAYS = 7;

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const dateLabel = (iso: string) => `${Number(iso.slice(8))} ${THAI_MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(0, 4)) + 543}`;

// Server-only: loads what's needed with the service key and builds the text.
export async function buildDigestText(
  now = new Date(),
  opts: { topics?: string[]; teamId?: string | null } = {},
): Promise<string | null> {
  const db = createAdminClient();
  const today = bangkokDay(now);
  const [clients, staff, tasks, invoices, rounds, receipts, leave, quotes, txs] = await Promise.all([
    db.from("clients").select("id, name"),
    db.from("staff").select("id, name").eq("is_active", true),
    db.from("tasks").select("id, title, client_id, assignee_id, status, due_date").neq("status", "done").lte("due_date", addDays(today, 1)),
    db.from("invoices").select("id, invoice_no, client_id, status, due_date, created_at, items, vat_percent, wht_percent").eq("status", "unpaid"),
    db.from("client_packages").select("id, client_id, package_id, amount, assigned_at, packages(name)"),
    db.from("receipts").select("id, client_id, client_package_id, amount, created_at"),
    db.from("leave_requests").select("staff_id, date_from, date_to, status").eq("status", "pending"),
    db.from("quotations").select("id, client_id, client_package_id, status, created_at, items, vat_percent, wht_percent"),
    db.from("transactions").select("id, type, client_id, receipt_id, amount, occurred_at").eq("type", "income"),
  ]);
  for (const r of [clients, staff, tasks, invoices, rounds, receipts, leave, quotes, txs]) if (r.error) throw r.error;

  // one shared billed/paid calculation (lib/billing.ts) so alerts match the app
  const billing = alertBilling(
    rounds.data!.map((r) => {
      const pkg = r.packages as { name: string } | { name: string }[] | null;
      return { id: r.id, clientId: r.client_id, packageName: (Array.isArray(pkg) ? pkg[0]?.name : pkg?.name) ?? "", amount: Number(r.amount), assignedAt: r.assigned_at };
    }),
    quotes.data!.map((q) => ({ id: q.id, clientId: q.client_id, clientPackageId: q.client_package_id, status: q.status, createdAt: q.created_at, items: q.items as QuotationItem[], vatPercent: q.vat_percent, whtPercent: q.wht_percent })),
    receipts.data!.map((r) => ({ id: r.id, clientId: r.client_id, clientPackageId: r.client_package_id, amount: Number(r.amount), createdAt: r.created_at })),
    txs.data!.map((t) => ({ id: t.id, type: t.type, clientId: t.client_id, receiptId: t.receipt_id, amount: Number(t.amount), occurredAt: t.occurred_at })),
  );

  // a team channel only reports its own people's work and leave
  let teamMembers: Set<string> | null = null;
  if (opts.teamId) {
    const { data, error } = await db.from("staff").select("id").eq("team_id", opts.teamId);
    if (error) throw error;
    teamMembers = new Set((data ?? []).map((s) => s.id as string));
  }

  const digest = buildDigest({
    today,
    graceDays: GRACE_DAYS,
    clients: clients.data!.map((c) => ({ id: c.id, name: c.name })),
    staff: staff.data!.map((s) => ({ id: s.id, name: s.name })),
    tasks: tasks.data!.filter((t) => !teamMembers || (t.assignee_id && teamMembers.has(t.assignee_id))).map((t) => ({ id: t.id, title: t.title, clientId: t.client_id, assigneeId: t.assignee_id, status: t.status, dueDate: t.due_date })),
    invoices: invoices.data!.map((i) => ({
      id: i.id,
      invoiceNo: i.invoice_no,
      clientId: i.client_id,
      status: i.status,
      dueDate: i.due_date ?? undefined,
      createdAt: i.created_at,
      total: calcQuotationTotals(i.items as QuotationItem[], i.vat_percent, i.wht_percent).total,
    })),
    rounds: billing.rounds,
    receipts: billing.receipts,
    leave: leave.data!.filter((l) => !teamMembers || teamMembers.has(l.staff_id)).map((l) => ({ staffId: l.staff_id, dateFrom: l.date_from, dateTo: l.date_to, status: l.status })),
  });
  return digestToText(opts.topics ? filterDigest(digest, opts.topics) : digest, dateLabel(today));
}

export function lineConfigured() {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_TO);
}

export const lineTokenSet = () => Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);

export async function pushLine(text: string, to = process.env.LINE_TO): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) throw new Error(`LINE ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
