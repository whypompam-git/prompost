import { createClient } from "./client";
import { cachedFetch } from "@/lib/offline/cache";
import type {
  Client,
  ClientPackage,
  LeaveRequest,
  LeaveStatus,
  Package,
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
  address: string | null;
  tax_id: string | null;
  entity_type: Client["entityType"];
};

const CLIENT_COLUMNS =
  "id, name, contact_name, phone, color_tag, payment_status, portal_token, address, tax_id, entity_type";

const fromClientRow = (r: ClientRow): Client => ({
  id: r.id,
  name: r.name,
  contactName: r.contact_name ?? undefined,
  phone: r.phone ?? undefined,
  colorTag: r.color_tag,
  paymentStatus: r.payment_status,
  portalToken: r.portal_token,
  address: r.address ?? undefined,
  taxId: r.tax_id ?? undefined,
  entityType: r.entity_type ?? "company",
});

export async function listClients(): Promise<Client[]> {
  return cachedFetch("clients", async () => {
    const { data, error } = await supabase()
      .from("clients")
      .select(CLIENT_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ClientRow[]).map(fromClientRow);
  });
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase().from("clients").select(CLIENT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromClientRow(data as ClientRow) : null;
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
      address: values.address,
      tax_id: values.taxId,
      entity_type: values.entityType,
    })
    .select(CLIENT_COLUMNS)
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
      address: values.address,
      tax_id: values.taxId,
      entity_type: values.entityType,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClientRow(id: string): Promise<void> {
  const { error } = await supabase().from("clients").delete().eq("id", id);
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
  role: Staff["role"];
  can_view_accounting: boolean;
  can_view_hr: boolean;
};

const STAFF_COLUMNS =
  "id, name, position, phone, email, hire_date, base_salary, avatar_color, role, can_view_accounting, can_view_hr";

const fromStaffRow = (r: StaffRow): Staff => ({
  id: r.id,
  name: r.name,
  position: r.position ?? "",
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  hireDate: r.hire_date ?? undefined,
  baseSalary: r.base_salary,
  avatarColor: r.avatar_color,
  role: r.role,
  canViewAccounting: r.can_view_accounting,
  canViewHr: r.can_view_hr,
});

export async function listStaff(): Promise<Staff[]> {
  return cachedFetch("staff", async () => {
    const { data, error } = await supabase()
      .from("staff")
      .select(STAFF_COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as StaffRow[]).map(fromStaffRow);
  });
}

// pin, when provided, is hashed client-side with bcryptjs before being sent
// — the resulting pin_hash column is never selected back to the browser
// (see STAFF_COLUMNS), and PIN verification only ever happens server-side
// in /api/auth/login via the service-role admin client.
export async function createStaffRow(
  values: Omit<Staff, "id">,
  pin?: string,
): Promise<Staff> {
  const bcrypt = await import("bcryptjs");
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
      role: values.role,
      can_view_accounting: values.canViewAccounting,
      can_view_hr: values.canViewHr,
      pin_hash: pin ? bcrypt.hashSync(pin, 10) : null,
    })
    .select(STAFF_COLUMNS)
    .single();
  if (error) throw error;
  return fromStaffRow(data as StaffRow);
}

export async function updateStaffRow(
  id: string,
  values: Omit<Staff, "id">,
  pin?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    name: values.name,
    position: values.position,
    phone: values.phone,
    email: values.email,
    hire_date: values.hireDate || null,
    base_salary: values.baseSalary,
    avatar_color: values.avatarColor,
    role: values.role,
    can_view_accounting: values.canViewAccounting,
    can_view_hr: values.canViewHr,
  };
  if (pin) {
    const bcrypt = await import("bcryptjs");
    patch.pin_hash = bcrypt.hashSync(pin, 10);
  }
  const { error } = await supabase().from("staff").update(patch).eq("id", id);
  if (error) throw error;
}

// Soft delete — tasks/payroll/leave rows reference staff.id with no cascade,
// so a hard delete would fail once a staff member has any history. Matches
// listStaff()'s own `eq("is_active", true)` filter.
export async function deleteStaffRow(id: string): Promise<void> {
  const { error } = await supabase().from("staff").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

// ── Deactivated staff management (Settings page, owner only) ────────────
export async function listInactiveStaff(): Promise<Staff[]> {
  const { data, error } = await supabase()
    .from("staff")
    .select(STAFF_COLUMNS)
    .eq("is_active", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as StaffRow[]).map(fromStaffRow);
}

export async function reactivateStaffRow(id: string): Promise<void> {
  const { error } = await supabase().from("staff").update({ is_active: true }).eq("id", id);
  if (error) throw error;
}

// Purges the staff member's leave/payroll history and unassigns their
// tasks first, since those rows reference staff.id with no cascade —
// an explicit, owner-only action for cleaning up test/duplicate rows.
export async function permanentlyDeleteStaffRow(id: string): Promise<void> {
  const db = supabase();
  const [leaveRes, payrollRes, tasksRes] = await Promise.all([
    db.from("leave_requests").delete().eq("staff_id", id),
    db.from("payroll_entries").delete().eq("staff_id", id),
    db.from("tasks").update({ assignee_id: null }).eq("assignee_id", id),
  ]);
  if (leaveRes.error) throw leaveRes.error;
  if (payrollRes.error) throw payrollRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const { error } = await db.from("staff").delete().eq("id", id);
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
  footage_url: string | null;
  ref_link: string | null;
  content_category: Task["contentCategory"] | null;
  script_text: string | null;
  shots: string[] | null;
  equipment: string[] | null;
  post_date: string | null;
  final_url: string | null;
  start_time: string | null;
  end_time: string | null;
};

const TASK_COLUMNS =
  "id, client_id, title, type, status, assignee_id, scheduled_date, due_date, notes, footage_url, ref_link, content_category, script_text, shots, equipment, post_date, final_url, start_time, end_time";

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
  footageUrl: r.footage_url ?? undefined,
  refLink: r.ref_link ?? undefined,
  contentCategory: r.content_category ?? undefined,
  scriptText: r.script_text ?? undefined,
  shots: r.shots ?? [],
  equipment: r.equipment ?? [],
  postDate: r.post_date ?? undefined,
  finalUrl: r.final_url ?? undefined,
  startTime: r.start_time?.slice(0, 5) ?? undefined,
  endTime: r.end_time?.slice(0, 5) ?? undefined,
});

export async function listTasks(): Promise<Task[]> {
  return cachedFetch("tasks", async () => {
    const { data, error } = await supabase()
      .from("tasks")
      .select(TASK_COLUMNS)
      .order("scheduled_date", { ascending: true });
    if (error) throw error;
    return (data as TaskRow[]).map(fromTaskRow);
  });
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase().from("tasks").select(TASK_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromTaskRow(data as TaskRow) : null;
}

// Distinct shots/equipment values used across every task, for the tag
// inputs' "remember what was typed before" suggestions.
export async function listDistinctShotsAndEquipment(): Promise<{
  shots: string[];
  equipment: string[];
}> {
  const { data, error } = await supabase().from("tasks").select("shots, equipment");
  if (error) throw error;
  const shots = new Set<string>();
  const equipment = new Set<string>();
  for (const row of data as { shots: string[] | null; equipment: string[] | null }[]) {
    (row.shots ?? []).forEach((s) => shots.add(s));
    (row.equipment ?? []).forEach((e) => equipment.add(e));
  }
  return { shots: [...shots].sort(), equipment: [...equipment].sort() };
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
      footage_url: values.footageUrl,
      ref_link: values.refLink,
      content_category: values.contentCategory,
      script_text: values.scriptText,
      shots: values.shots ?? [],
      equipment: values.equipment ?? [],
      post_date: values.postDate || null,
      final_url: values.finalUrl,
      start_time: values.startTime || null,
      end_time: values.endTime || null,
    })
    .select(TASK_COLUMNS)
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
  if (values.footageUrl !== undefined) patch.footage_url = values.footageUrl;
  if (values.refLink !== undefined) patch.ref_link = values.refLink;
  if (values.contentCategory !== undefined) patch.content_category = values.contentCategory;
  if (values.scriptText !== undefined) patch.script_text = values.scriptText;
  if (values.shots !== undefined) patch.shots = values.shots;
  if (values.equipment !== undefined) patch.equipment = values.equipment;
  if (values.postDate !== undefined) patch.post_date = values.postDate || null;
  if (values.finalUrl !== undefined) patch.final_url = values.finalUrl;
  if (values.startTime !== undefined) patch.start_time = values.startTime || null;
  if (values.endTime !== undefined) patch.end_time = values.endTime || null;
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase().from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTaskRow(id: string): Promise<void> {
  const { error } = await supabase().from("tasks").delete().eq("id", id);
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
  valid_until: string | null;
  payment_note: string | null;
  notes: string | null;
  client_feedback: string | null;
  share_token: string;
};

const QUOTATION_COLUMNS =
  "id, client_id, quote_no, items, vat_percent, wht_percent, status, created_at, valid_until, payment_note, notes, client_feedback, share_token";

const fromQuotationRow = (r: QuotationRow): Quotation => ({
  id: r.id,
  clientId: r.client_id,
  quoteNo: r.quote_no,
  items: r.items,
  vatPercent: r.vat_percent,
  whtPercent: r.wht_percent,
  status: r.status,
  createdAt: r.created_at,
  validUntil: r.valid_until ?? undefined,
  paymentNote: r.payment_note ?? undefined,
  notes: r.notes ?? undefined,
  clientFeedback: r.client_feedback ?? undefined,
  shareToken: r.share_token,
});

export async function listQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase()
    .from("quotations")
    .select(QUOTATION_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as QuotationRow[]).map(fromQuotationRow);
}

export async function getQuotationByShareToken(token: string): Promise<Quotation | null> {
  const { data, error } = await supabase()
    .from("quotations")
    .select(QUOTATION_COLUMNS)
    .eq("share_token", token)
    .maybeSingle();
  if (error) throw error;
  return data ? fromQuotationRow(data as QuotationRow) : null;
}

export async function submitQuotationFeedback(shareToken: string, feedback: string): Promise<void> {
  const { error } = await supabase()
    .from("quotations")
    .update({ client_feedback: feedback })
    .eq("share_token", shareToken);
  if (error) throw error;
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
  validUntil?: string;
  paymentNote?: string;
  notes?: string;
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
      valid_until: values.validUntil || null,
      payment_note: values.paymentNote,
      notes: values.notes,
    })
    .select(QUOTATION_COLUMNS)
    .single();
  if (error) throw error;
  return fromQuotationRow(data as QuotationRow);
}

export async function updateQuotationStatus(id: string, status: Quotation["status"]): Promise<void> {
  const { error } = await supabase().from("quotations").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteQuotationRow(id: string): Promise<void> {
  const { error } = await supabase().from("quotations").delete().eq("id", id);
  if (error) throw error;
}

// ── Receipts ───────────────────────────────────────────────────────────
type ReceiptRow = {
  id: string;
  client_id: string;
  receipt_no: string;
  amount: number;
  created_at: string;
  notes: string | null;
  share_token: string;
};

const RECEIPT_COLUMNS = "id, client_id, receipt_no, amount, created_at, notes, share_token";

const fromReceiptRow = (r: ReceiptRow): Receipt => ({
  id: r.id,
  clientId: r.client_id,
  receiptNo: r.receipt_no,
  amount: r.amount,
  createdAt: r.created_at,
  notes: r.notes ?? undefined,
  shareToken: r.share_token,
});

export async function listReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase()
    .from("receipts")
    .select(RECEIPT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ReceiptRow[]).map(fromReceiptRow);
}

export async function getReceiptByShareToken(token: string): Promise<Receipt | null> {
  const { data, error } = await supabase()
    .from("receipts")
    .select(RECEIPT_COLUMNS)
    .eq("share_token", token)
    .maybeSingle();
  if (error) throw error;
  return data ? fromReceiptRow(data as ReceiptRow) : null;
}

export async function createReceiptRow(values: {
  clientId: string;
  amount: number;
  notes?: string;
}): Promise<Receipt> {
  const receiptNo = await nextDocNo("receipts", "RC");
  const { data, error } = await supabase()
    .from("receipts")
    .insert({
      client_id: values.clientId,
      receipt_no: receiptNo,
      amount: values.amount,
      notes: values.notes,
    })
    .select(RECEIPT_COLUMNS)
    .single();
  if (error) throw error;
  return fromReceiptRow(data as ReceiptRow);
}

export async function deleteReceiptRow(id: string): Promise<void> {
  const { error } = await supabase().from("receipts").delete().eq("id", id);
  if (error) throw error;
}

// ── Agency settings (single row — the "seller" info on printed docs) ────
type AgencySettingsRow = {
  name: string | null;
  address: string | null;
  phone: string | null;
  tax_id: string | null;
  bank_info: string | null;
};

export async function getAgencySettings() {
  const { data, error } = await supabase()
    .from("agency_settings")
    .select("name, address, phone, tax_id, bank_info")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  const r = data as AgencySettingsRow | null;
  return {
    name: r?.name ?? "",
    address: r?.address ?? "",
    phone: r?.phone ?? "",
    taxId: r?.tax_id ?? "",
    bankInfo: r?.bank_info ?? "",
  };
}

export async function saveAgencySettings(values: {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  bankInfo: string;
}): Promise<void> {
  const { error } = await supabase()
    .from("agency_settings")
    .upsert({
      id: true,
      name: values.name,
      address: values.address,
      phone: values.phone,
      tax_id: values.taxId,
      bank_info: values.bankInfo,
    });
  if (error) throw error;
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

export async function deleteTransactionRow(id: string): Promise<void> {
  const { error } = await supabase().from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// ── Packages ───────────────────────────────────────────────────────────
type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  start_date: string | null;
  end_date: string | null;
};

const PACKAGE_COLUMNS = "id, name, description, price, start_date, end_date";

const fromPackageRow = (r: PackageRow): Package => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  price: r.price,
  startDate: r.start_date ?? undefined,
  endDate: r.end_date ?? undefined,
});

export async function listPackages(): Promise<Package[]> {
  const { data, error } = await supabase()
    .from("packages")
    .select(PACKAGE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PackageRow[]).map(fromPackageRow);
}

export async function createPackageRow(values: Omit<Package, "id">): Promise<Package> {
  const { data, error } = await supabase()
    .from("packages")
    .insert({
      name: values.name,
      description: values.description,
      price: values.price,
      start_date: values.startDate || null,
      end_date: values.endDate || null,
    })
    .select(PACKAGE_COLUMNS)
    .single();
  if (error) throw error;
  return fromPackageRow(data as PackageRow);
}

export async function updatePackageRow(id: string, values: Omit<Package, "id">): Promise<void> {
  const { error } = await supabase()
    .from("packages")
    .update({
      name: values.name,
      description: values.description,
      price: values.price,
      start_date: values.startDate || null,
      end_date: values.endDate || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePackageRow(id: string): Promise<void> {
  const { error } = await supabase().from("packages").delete().eq("id", id);
  if (error) throw error;
}

// ── Client ↔ Package assignments ──────────────────────────────────────
type ClientPackageRow = {
  id: string;
  client_id: string;
  package_id: string;
  assigned_at: string;
};

const fromClientPackageRow = (r: ClientPackageRow): ClientPackage => ({
  id: r.id,
  clientId: r.client_id,
  packageId: r.package_id,
  assignedAt: r.assigned_at,
});

export async function listClientPackages(): Promise<ClientPackage[]> {
  const { data, error } = await supabase()
    .from("client_packages")
    .select("id, client_id, package_id, assigned_at")
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data as ClientPackageRow[]).map(fromClientPackageRow);
}

export async function assignPackageToClient(clientId: string, packageId: string): Promise<ClientPackage> {
  const { data, error } = await supabase()
    .from("client_packages")
    .insert({ client_id: clientId, package_id: packageId })
    .select("id, client_id, package_id, assigned_at")
    .single();
  if (error) throw error;
  return fromClientPackageRow(data as ClientPackageRow);
}

export async function unassignClientPackage(id: string): Promise<void> {
  const { error } = await supabase().from("client_packages").delete().eq("id", id);
  if (error) throw error;
}
