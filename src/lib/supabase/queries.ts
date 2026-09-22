import { createClient } from "./client";
import type {
  Client,
  LeaveRequest,
  LeaveStatus,
  PayrollEntry,
  Quotation,
  QuotationItem,
  Receipt,
  Staff,
  Task,
  TaskStatus,
  Transaction,
} from "../types";

// Thin data-access layer over the schema in supabase/migrations/0001_init.sql.
// Every function maps the DB's snake_case rows to this app's camelCase types,
// so nothing outside this file needs to know the column names changed.
// Wired into every page as of the 0002 migration (RLS policies for the
// no-auth-yet case). src/lib/mock-data.ts is kept only as sample data for
// scripts/seed.mjs and offline reference — no page imports it anymore.

const supabase = () => createClient();

// ── Clients ────────────────────────────────────────────────────────────
type ClientRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  color_tag: string;
  payment_status: Client["paymentStatus"];
  portal_token: string;
};

const fromClientRow = (r: ClientRow): Client => ({
  id: r.id,
  name: r.name,
  contactName: r.contact_name ?? undefined,
  phone: r.phone ?? undefined,
  colorTag: r.color_tag,
  paymentStatus: r.payment_status,
  portalToken: r.portal_token,
});

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase()
    .from("clients")
    .select("id, name, contact_name, phone, color_tag, payment_status, portal_token")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ClientRow[]).map(fromClientRow);
}

export async function createClientRow(
  values: Omit<Client, "id" | "portalToken">,
): Promise<Client> {
  const { data, error } = await supabase()
    .from("clients")
    .insert({
      name: values.name,
      contact_name: values.contactName,
      phone: values.phone,
      color_tag: values.colorTag,
      payment_status: values.paymentStatus,
    })
    .select("id, name, contact_name, phone, color_tag, payment_status, portal_token")
    .single();
  if (error) throw error;
  return fromClientRow(data as ClientRow);
}

export async function updateClientRow(
  id: string,
  values: Omit<Client, "id" | "portalToken">,
): Promise<void> {
  const { error } = await supabase()
    .from("clients")
    .update({
      name: values.name,
      contact_name: values.contactName,
      phone: values.phone,
      color_tag: values.colorTag,
      payment_status: values.paymentStatus,
    })
    .eq("id", id);
  if (error) throw error;
}

// ── Staff ──────────────────────────────────────────────────────────────
type StaffRow = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  base_salary: number;
  avatar_color: string;
};

const fromStaffRow = (r: StaffRow): Staff => ({
  id: r.id,
  name: r.name,
  position: r.position ?? "",
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  hireDate: r.hire_date ?? undefined,
  baseSalary: r.base_salary,
  avatarColor: r.avatar_color,
});

export async function listStaff(): Promise<Staff[]> {
  const { data, error } = await supabase()
    .from("staff")
    .select("id, name, position, phone, email, hire_date, base_salary, avatar_color")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as StaffRow[]).map(fromStaffRow);
}

export async function createStaffRow(
  values: Omit<Staff, "id">,
): Promise<Staff> {
  const { data, error } = await supabase()
    .from("staff")
    .insert({
      name: values.name,
      position: values.position,
      phone: values.phone,
      email: values.email,
      hire_date: values.hireDate || null,
      base_salary: values.baseSalary,
      avatar_color: values.avatarColor,
    })
    .select("id, name, position, phone, email, hire_date, base_salary, avatar_color")
    .single();
  if (error) throw error;
  return fromStaffRow(data as StaffRow);
}

export async function updateStaffRow(id: string, values: Omit<Staff, "id">): Promise<void> {
  const { error } = await supabase()
    .from("staff")
    .update({
      name: values.name,
      position: values.position,
      phone: values.phone,
      email: values.email,
      hire_date: values.hireDate || null,
      base_salary: values.baseSalary,
      avatar_color: values.avatarColor,
    })
    .eq("id", id);
  if (error) throw error;
}

// ── Tasks ──────────────────────────────────────────────────────────────
type TaskRow = {
  id: string;
  client_id: string;
  title: string;
  type: Task["type"];
  status: TaskStatus;
  assignee_id: string | null;
  scheduled_date: string;
  due_date: string;
  notes: string | null;
};

const fromTaskRow = (r: TaskRow): Task => ({
  id: r.id,
  clientId: r.client_id,
  title: r.title,
  type: r.type,
  status: r.status,
  assigneeId: r.assignee_id,
  scheduledDate: r.scheduled_date,
  dueDate: r.due_date,
  notes: r.notes ?? undefined,
});

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase()
    .from("tasks")
    .select("id, client_id, title, type, status, assignee_id, scheduled_date, due_date, notes")
    .order("scheduled_date", { ascending: true });
  if (error) throw error;
  return (data as TaskRow[]).map(fromTaskRow);
}

export async function createTaskRow(values: Omit<Task, "id">): Promise<Task> {
  const { data, error } = await supabase()
    .from("tasks")
    .insert({
      client_id: values.clientId,
      title: values.title,
      type: values.type,
      status: values.status,
      assignee_id: values.assigneeId,
      scheduled_date: values.scheduledDate,
      due_date: values.dueDate,
      notes: values.notes,
    })
    .select("id, client_id, title, type, status, assignee_id, scheduled_date, due_date, notes")
    .single();
  if (error) throw error;
  return fromTaskRow(data as TaskRow);
}

export async function updateTaskRow(id: string, values: Partial<Omit<Task, "id">>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (values.clientId !== undefined) patch.client_id = values.clientId;
  if (values.title !== undefined) patch.title = values.title;
  if (values.type !== undefined) patch.type = values.type;
  if (values.status !== undefined) patch.status = values.status;
  if (values.assigneeId !== undefined) patch.assignee_id = values.assigneeId;
  if (values.scheduledDate !== undefined) patch.scheduled_date = values.scheduledDate;
  if (values.dueDate !== undefined) patch.due_date = values.dueDate;
  if (values.notes !== undefined) patch.notes = values.notes;
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase().from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

// ── Leave requests ─────────────────────────────────────────────────────
type LeaveRow = {
  id: string;
  staff_id: string;
  date_from: string;
  date_to: string;
  leave_type: LeaveRequest["leaveType"];
  status: LeaveStatus;
  note: string | null;
};

const fromLeaveRow = (r: LeaveRow): LeaveRequest => ({
  id: r.id,
  staffId: r.staff_id,
  dateFrom: r.date_from,
  dateTo: r.date_to,
  leaveType: r.leave_type,
  status: r.status,
  note: r.note ?? undefined,
});

export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  const { data, error } = await supabase()
    .from("leave_requests")
    .select("id, staff_id, date_from, date_to, leave_type, status, note")
    .order("date_from", { ascending: false });
  if (error) throw error;
  return (data as LeaveRow[]).map(fromLeaveRow);
}

export async function createLeaveRequestRow(
  values: Omit<LeaveRequest, "id" | "status">,
): Promise<LeaveRequest> {
  const { data, error } = await supabase()
    .from("leave_requests")
    .insert({
      staff_id: values.staffId,
      date_from: values.dateFrom,
      date_to: values.dateTo,
      leave_type: values.leaveType,
      note: values.note,
    })
    .select("id, staff_id, date_from, date_to, leave_type, status, note")
    .single();
  if (error) throw error;
  return fromLeaveRow(data as LeaveRow);
}

export async function updateLeaveStatus(id: string, status: LeaveStatus): Promise<void> {
  const { error } = await supabase().from("leave_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

// ── Payroll ────────────────────────────────────────────────────────────
type PayrollRow = {
  id: string;
  staff_id: string;
  period_month: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  paid_at: string | null;
};

const fromPayrollRow = (r: PayrollRow): PayrollEntry => ({
  id: r.id,
  staffId: r.staff_id,
  periodMonth: r.period_month,
  baseSalary: r.base_salary,
  bonus: r.bonus,
  deductions: r.deductions,
  paidAt: r.paid_at,
});

export async function listPayrollEntries(periodMonth: string): Promise<PayrollEntry[]> {
  const { data, error } = await supabase()
    .from("payroll_entries")
    .select("id, staff_id, period_month, base_salary, bonus, deductions, paid_at")
    .eq("period_month", periodMonth);
  if (error) throw error;
  return (data as PayrollRow[]).map(fromPayrollRow);
}

// Ensures every active staff member has a payroll row for the given month —
// call once per HR page load before listPayrollEntries().
export async function ensurePayrollEntriesForMonth(
  periodMonth: string,
  staff: Staff[],
): Promise<void> {
  const rows = staff.map((s) => ({
    staff_id: s.id,
    period_month: periodMonth,
    base_salary: s.baseSalary,
  }));
  const { error } = await supabase()
    .from("payroll_entries")
    .upsert(rows, { onConflict: "staff_id,period_month", ignoreDuplicates: true });
  if (error) throw error;
}

export async function updatePayrollEntry(
  id: string,
  patch: Partial<Pick<PayrollEntry, "bonus" | "deductions">>,
): Promise<void> {
  const { error } = await supabase().from("payroll_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function togglePayrollPaid(id: string, paid: boolean): Promise<void> {
  const { error } = await supabase()
    .from("payroll_entries")
    .update({ paid_at: paid ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw error;
}

// ── Quotations ─────────────────────────────────────────────────────────
type QuotationRow = {
  id: string;
  client_id: string;
  quote_no: string;
  items: QuotationItem[];
  vat_percent: number;
  wht_percent: number;
  status: Quotation["status"];
  created_at: string;
};

const fromQuotationRow = (r: QuotationRow): Quotation => ({
  id: r.id,
  clientId: r.client_id,
  quoteNo: r.quote_no,
  items: r.items,
  vatPercent: r.vat_percent,
  whtPercent: r.wht_percent,
  status: r.status,
  createdAt: r.created_at,
});

export async function listQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase()
    .from("quotations")
    .select("id, client_id, quote_no, items, vat_percent, wht_percent, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as QuotationRow[]).map(fromQuotationRow);
}

// Doc numbers are assigned by counting existing rows for the current
// พ.ศ. year — fine for one small team's volume; swap for a Postgres
// sequence/function if this ever needs to be race-safe under concurrency.
async function nextDocNo(table: "quotations" | "receipts", prefix: string) {
  const year = new Date().getFullYear() + 543;
  const { count, error } = await supabase()
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return `${prefix}${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

export async function createQuotationRow(values: {
  clientId: string;
  items: QuotationItem[];
  vatPercent: number;
  whtPercent: number;
}): Promise<Quotation> {
  const quoteNo = await nextDocNo("quotations", "QT");
  const { data, error } = await supabase()
    .from("quotations")
    .insert({
      client_id: values.clientId,
      quote_no: quoteNo,
      items: values.items,
      vat_percent: values.vatPercent,
      wht_percent: values.whtPercent,
    })
    .select("id, client_id, quote_no, items, vat_percent, wht_percent, status, created_at")
    .single();
  if (error) throw error;
  return fromQuotationRow(data as QuotationRow);
}

// ── Receipts ───────────────────────────────────────────────────────────
type ReceiptRow = {
  id: string;
  client_id: string;
  receipt_no: string;
  amount: number;
  created_at: string;
};

const fromReceiptRow = (r: ReceiptRow): Receipt => ({
  id: r.id,
  clientId: r.client_id,
  receiptNo: r.receipt_no,
  amount: r.amount,
  createdAt: r.created_at,
});

export async function listReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase()
    .from("receipts")
    .select("id, client_id, receipt_no, amount, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ReceiptRow[]).map(fromReceiptRow);
}

export async function createReceiptRow(values: {
  clientId: string;
  amount: number;
}): Promise<Receipt> {
  const receiptNo = await nextDocNo("receipts", "RC");
  const { data, error } = await supabase()
    .from("receipts")
    .insert({ client_id: values.clientId, receipt_no: receiptNo, amount: values.amount })
    .select("id, client_id, receipt_no, amount, created_at")
    .single();
  if (error) throw error;
  return fromReceiptRow(data as ReceiptRow);
}

// ── Transactions ───────────────────────────────────────────────────────
type TransactionRow = {
  id: string;
  type: Transaction["type"];
  category: string;
  amount: number;
  description: string | null;
  slip_url: string | null;
  occurred_at: string;
};

const fromTransactionRow = (r: TransactionRow): Transaction => ({
  id: r.id,
  type: r.type,
  category: r.category,
  amount: r.amount,
  description: r.description ?? undefined,
  slipUrl: r.slip_url ?? undefined,
  occurredAt: r.occurred_at,
});

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase()
    .from("transactions")
    .select("id, type, category, amount, description, slip_url, occurred_at")
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(fromTransactionRow);
}

export async function createTransactionRow(
  values: Omit<Transaction, "id">,
): Promise<Transaction> {
  const { data, error } = await supabase()
    .from("transactions")
    .insert({
      type: values.type,
      category: values.category,
      amount: values.amount,
      description: values.description,
      slip_url: values.slipUrl,
      occurred_at: values.occurredAt,
    })
    .select("id, type, category, amount, description, slip_url, occurred_at")
    .single();
  if (error) throw error;
  return fromTransactionRow(data as TransactionRow);
}
