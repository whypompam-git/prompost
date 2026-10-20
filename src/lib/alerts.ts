// What needs attention today — shared by the daily LINE digest and the in-app
// bell. Pure (no I/O) so it's unit-tested. Dates are "YYYY-MM-DD" in Bangkok time.

export type AlertInput = {
  today: string;
  graceDays: number;
  clients: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  tasks: { id: string; title: string; clientId: string; assigneeId: string | null; status: string; dueDate: string }[];
  invoices: { id: string; invoiceNo: string; clientId: string; status: string; dueDate?: string; createdAt: string; total: number }[];
  rounds: { id: string; clientId: string; packageName: string; amount: number; assignedAt: string }[];
  receipts: { clientPackageId?: string; amount: number }[];
  leave: { staffId: string; dateFrom: string; dateTo: string; status: string }[];
};

export type Digest = {
  overduePayments: { label: string; client: string; amount: number; days: number }[];
  tasksOverdue: { title: string; client: string; assignee: string; days: number }[];
  tasksToday: { title: string; client: string; assignee: string }[];
  tasksTomorrow: { title: string; client: string; assignee: string }[];
  pendingLeave: { staff: string; from: string; to: string }[];
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
export const bangkokDay = (d: Date | string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(typeof d === "string" ? new Date(d) : d);

export function buildDigest(i: AlertInput): Digest {
  const client = (id: string) => i.clients.find((c) => c.id === id)?.name ?? "—";
  const staff = (id: string | null) => (id ? (i.staff.find((s) => s.id === id)?.name ?? "—") : "ยังไม่มอบหมาย");
  const tomorrow = addDays(i.today, 1);

  const overduePayments: Digest["overduePayments"] = [];

  for (const inv of i.invoices) {
    if (inv.status !== "unpaid") continue;
    const due = inv.dueDate ? inv.dueDate.slice(0, 10) : addDays(bangkokDay(inv.createdAt), i.graceDays);
    if (due < i.today) {
      overduePayments.push({ label: inv.invoiceNo, client: client(inv.clientId), amount: inv.total, days: daysBetween(due, i.today) });
    }
  }

  // current billing round per client = newest assigned
  const current = new Map<string, AlertInput["rounds"][number]>();
  for (const r of i.rounds) {
    const prev = current.get(r.clientId);
    if (!prev || r.assignedAt > prev.assignedAt) current.set(r.clientId, r);
  }
  for (const r of current.values()) {
    const paid = i.receipts.filter((x) => x.clientPackageId === r.id).reduce((s, x) => s + x.amount, 0);
    const outstanding = Math.max(r.amount - paid, 0);
    const age = daysBetween(bangkokDay(r.assignedAt), i.today);
    if (outstanding > 0 && age >= i.graceDays) {
      overduePayments.push({ label: `แพ็คเกจ ${r.packageName}`, client: client(r.clientId), amount: outstanding, days: age });
    }
  }
  overduePayments.sort((a, b) => b.days - a.days);

  // "waiting" = Plan / Pending, in the client's hands — not overdue work for the team
  const open = i.tasks.filter((t) => t.status !== "done" && t.status !== "waiting");
  const row = (t: AlertInput["tasks"][number]) => ({ title: t.title, client: client(t.clientId), assignee: staff(t.assigneeId) });
  return {
    overduePayments,
    tasksOverdue: open.filter((t) => t.dueDate < i.today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((t) => ({ ...row(t), days: daysBetween(t.dueDate, i.today) })),
    tasksToday: open.filter((t) => t.dueDate === i.today).map(row),
    tasksTomorrow: open.filter((t) => t.dueDate === tomorrow).map(row),
    pendingLeave: i.leave.filter((l) => l.status === "pending").map((l) => ({ staff: staff(l.staffId), from: l.dateFrom, to: l.dateTo })),
  };
}

const baht = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const MAX_LINES = 8;

function section<T>(title: string, items: T[], line: (t: T) => string): string[] {
  if (items.length === 0) return [];
  const shown = items.slice(0, MAX_LINES).map(line);
  if (items.length > MAX_LINES) shown.push(`…และอีก ${items.length - MAX_LINES} รายการ`);
  return [`${title} (${items.length})`, ...shown, ""];
}

// Plain text for LINE; null when there is nothing to report.
export function digestToText(d: Digest, dateLabel: string): string | null {
  const lines = [
    ...section("💰 ค้างชำระ", d.overduePayments, (p) => `• ${p.client} — ${p.label} ฿${baht(p.amount)} (เกิน ${p.days} วัน)`),
    ...section("🔴 งานเลยกำหนดส่ง", d.tasksOverdue, (t) => `• ${t.title} (${t.client}) · ${t.assignee} · เลย ${t.days} วัน`),
    ...section("🟠 งานส่งวันนี้", d.tasksToday, (t) => `• ${t.title} (${t.client}) · ${t.assignee}`),
    ...section("🟡 งานส่งพรุ่งนี้", d.tasksTomorrow, (t) => `• ${t.title} (${t.client}) · ${t.assignee}`),
    ...section("🏖️ คำขอลารออนุมัติ", d.pendingLeave, (l) => `• ${l.staff}: ${l.from}${l.to !== l.from ? ` – ${l.to}` : ""}`),
  ];
  if (lines.length === 0) return null;
  return [`📋 สรุปประจำวัน ${dateLabel}`, "", ...lines].join("\n").trimEnd().slice(0, 4900);
}

export const DIGEST_TOPICS = [
  { key: "payments", label: "ค้างชำระ" },
  { key: "tasks", label: "งานเลยกำหนด/ส่งวันนี้-พรุ่งนี้" },
  { key: "leave", label: "คำขอลา" },
] as const;

// A channel only gets the sections it subscribed to.
export function filterDigest(d: Digest, topics: string[]): Digest {
  const has = (t: string) => topics.includes(t);
  return {
    overduePayments: has("payments") ? d.overduePayments : [],
    tasksOverdue: has("tasks") ? d.tasksOverdue : [],
    tasksToday: has("tasks") ? d.tasksToday : [],
    tasksTomorrow: has("tasks") ? d.tasksTomorrow : [],
    pendingLeave: has("leave") ? d.pendingLeave : [],
  };
}

export type ChannelSchedule = { send_hour: number; enabled: boolean; last_sent_on: string | null };

// Due when it's the channel's hour (or up to 2 hours later, in case the
// scheduler ran late) and it hasn't gone out today.
export function channelDue(c: ChannelSchedule, hour: number, today: string): boolean {
  if (!c.enabled || c.last_sent_on === today) return false;
  const late = (hour - c.send_hour + 24) % 24;
  return late <= 2;
}

export const bangkokHour = (d: Date) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).format(d)) % 24;
