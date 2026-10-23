import { createClient } from "./client";
import { cachedFetch } from "@/lib/offline/cache";
import { defaultStatusFor } from "@/lib/workflow";
import { normalizePermissions } from "@/lib/permissions";
import { slugify } from "@/lib/slug";
import { calcQuotationTotals } from "@/lib/accounting";
import { DEFAULT_CONTRACT_TEMPLATE, fillVariables } from "@/lib/contractTemplate";
import type {
  Queue,
  Client,
  ClientNote,
  ClientPackage,
  Contract,
  ContractInstallment,
  ContractParty,
  ContractTemplate,
  Invoice,
  LeaveRequest,
  LeaveStatus,
  Package,
  PayrollEntry,
  Quotation,
  QuotationItem,
  Receipt,
  Staff,
  Team,
  Task,
  TaskSettings,
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
  name_en: string | null;
  billing_name: string | null;
  slug: string | null;
  portal_enabled: boolean;
  address: string | null;
  tax_id: string | null;
  entity_type: Client["entityType"];
  priority: number;
  brand_brief: string | null;
  brand_images: string[] | null;
  manager_id: string | null;
};

const CLIENT_COLUMNS =
  "id, name, contact_name, phone, color_tag, payment_status, portal_token, name_en, billing_name, slug, portal_enabled, address, tax_id, entity_type, priority, brand_brief, brand_images, manager_id";

const fromClientRow = (r: ClientRow): Client => ({
  id: r.id,
  name: r.name,
  contactName: r.contact_name ?? undefined,
  phone: r.phone ?? undefined,
  colorTag: r.color_tag,
  paymentStatus: r.payment_status,
  portalToken: r.portal_token,
  nameEn: r.name_en ?? undefined,
  billingName: r.billing_name ?? undefined,
  slug: r.slug ?? undefined,
  portalEnabled: r.portal_enabled ?? true,
  address: r.address ?? undefined,
  taxId: r.tax_id ?? undefined,
  entityType: r.entity_type ?? "company",
  priority: r.priority ?? 0,
  brandBrief: r.brand_brief ?? undefined,
  brandImages: r.brand_images ?? [],
  managerId: r.manager_id ?? undefined,
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

type ClientInput = Omit<Client, "id" | "portalToken" | "portalEnabled" | "slug">;

const clientPayload = (values: ClientInput) => ({
  name: values.name,
  name_en: values.nameEn || null,
  billing_name: values.billingName || null,
  contact_name: values.contactName,
  phone: values.phone,
  color_tag: values.colorTag,
  payment_status: values.paymentStatus,
  address: values.address,
  tax_id: values.taxId,
  entity_type: values.entityType,
  priority: values.priority,
  brand_brief: values.brandBrief || null,
  brand_images: values.brandImages,
  manager_id: values.managerId || null,
});

// slug comes from the English name; on a collision, add a numeric suffix.
async function pickSlug(nameEn: string | undefined, ownId?: string): Promise<string | null> {
  const base = slugify(nameEn ?? "");
  if (!base) return null;
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data } = await supabase().from("clients").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === ownId) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createClientRow(values: ClientInput): Promise<Client> {
  const slug = await pickSlug(values.nameEn);
  const { data, error } = await supabase()
    .from("clients")
    .insert({ ...clientPayload(values), slug })
    .select(CLIENT_COLUMNS)
    .single();
  if (error) throw error;
  return fromClientRow(data as ClientRow);
}

export async function updateClientRow(id: string, values: ClientInput): Promise<void> {
  const slug = await pickSlug(values.nameEn, id);
  const { error } = await supabase()
    .from("clients")
    .update({ ...clientPayload(values), slug })
    .eq("id", id);
  if (error) throw error;
}

export async function setClientPaymentStatus(id: string, status: Client["paymentStatus"]): Promise<void> {
  const { error } = await supabase().from("clients").update({ payment_status: status }).eq("id", id);
  if (error) throw error;
}

export async function setClientManager(id: string, managerId: string | null): Promise<void> {
  const { error } = await supabase().from("clients").update({ manager_id: managerId }).eq("id", id);
  if (error) throw error;
}

export async function setClientPhone(id: string, phone: string): Promise<void> {
  const { error } = await supabase().from("clients").update({ phone: phone || null }).eq("id", id);
  if (error) throw error;
}

export async function setClientPriority(id: string, priority: number): Promise<void> {
  const { error } = await supabase().from("clients").update({ priority }).eq("id", id);
  if (error) throw error;
}

export async function setClientPortalEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase().from("clients").update({ portal_enabled: enabled }).eq("id", id);
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
  permissions: Record<string, boolean> | null;
  photo_url: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  team_id: string | null;
};

const STAFF_COLUMNS =
  "id, name, position, phone, email, hire_date, base_salary, avatar_color, role, can_view_accounting, permissions, photo_url, bank_name, bank_account_no, bank_account_name, team_id";

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
  photoUrl: r.photo_url ?? undefined,
  permissions: normalizePermissions(r.permissions, r.can_view_accounting),
  bankName: r.bank_name ?? undefined,
  bankAccountNo: r.bank_account_no ?? undefined,
  bankAccountName: r.bank_account_name ?? undefined,
  teamId: r.team_id ?? undefined,
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
      can_view_accounting: values.permissions.accounting,
      permissions: values.permissions,
      team_id: values.teamId ?? null,
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
    can_view_accounting: values.permissions.accounting,
    permissions: values.permissions,
    team_id: values.teamId ?? null,
  };
  if (pin) {
    const bcrypt = await import("bcryptjs");
    patch.pin_hash = bcrypt.hashSync(pin, 10);
  }
  const { error } = await supabase().from("staff").update(patch).eq("id", id);
  if (error) throw error;
}

// ── Teams ────────────────────────────────────────────────────────────────
type TeamRow = { id: string; name: string; sort_order: number };
const fromTeamRow = (r: TeamRow): Team => ({ id: r.id, name: r.name, sortOrder: r.sort_order });

export async function listTeams(): Promise<Team[]> {
  return cachedFetch("teams", async () => {
    const { data, error } = await supabase().from("teams").select("id, name, sort_order").order("sort_order").order("created_at");
    if (error) throw error;
    return (data as TeamRow[]).map(fromTeamRow);
  });
}

export async function createTeam(name: string, sortOrder: number): Promise<Team> {
  const { data, error } = await supabase()
    .from("teams")
    .insert({ name: name.trim(), sort_order: sortOrder })
    .select("id, name, sort_order")
    .single();
  if (error) throw error;
  return fromTeamRow(data as TeamRow);
}

export async function renameTeam(id: string, name: string): Promise<void> {
  const { error } = await supabase().from("teams").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

// Members keep working — staff.team_id is set null by the FK.
export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase().from("teams").delete().eq("id", id);
  if (error) throw error;
}

// Self-service — used by /profile, where a staff member edits only their
// own display name and photo, not the full admin staff record.
export async function updateOwnProfile(
  id: string,
  values: {
    name: string;
    photoUrl: string | null;
    bankName?: string | null;
    bankAccountNo?: string | null;
    bankAccountName?: string | null;
  },
): Promise<void> {
  const { error } = await supabase()
    .from("staff")
    .update({
      name: values.name,
      photo_url: values.photoUrl,
      bank_name: values.bankName ?? null,
      bank_account_no: values.bankAccountNo ?? null,
      bank_account_name: values.bankAccountName ?? null,
    })
    .eq("id", id);
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
  cover_url: string | null;
  start_time: string | null;
  end_time: string | null;
  shot_by: string | null;
  shot_team_id: string | null;
  revision_count: number | null;
  revision_brief: string | null;
  queue_id: string | null;
  shoot_order: number | null;
  edit_date: string | null;
};

const TASK_COLUMNS =
  "id, client_id, title, type, status, assignee_id, scheduled_date, due_date, notes, footage_url, ref_link, content_category, script_text, shots, equipment, post_date, final_url, cover_url, start_time, end_time, shot_by, shot_team_id, revision_count, revision_brief, queue_id, shoot_order, edit_date";

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
  coverUrl: r.cover_url ?? undefined,
  startTime: r.start_time?.slice(0, 5) ?? undefined,
  endTime: r.end_time?.slice(0, 5) ?? undefined,
  shotById: r.shot_by,
  shotTeamId: r.shot_team_id,
  revisionCount: r.revision_count ?? 0,
  revisionBrief: r.revision_brief ?? undefined,
  queueId: r.queue_id,
  shootOrder: r.shoot_order,
  editDate: r.edit_date,
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

// Slim read for screens that only count tasks per person — the full list
// carries scripts and links and is close to 1 MB.
export async function listTaskAssignments(): Promise<Pick<Task, "id" | "assigneeId" | "status">[]> {
  const { data, error } = await supabase().from("tasks").select("id, assignee_id, status");
  if (error) throw error;
  return (data as { id: string; assignee_id: string | null; status: Task["status"] }[]).map((r) => ({
    id: r.id,
    assigneeId: r.assignee_id,
    status: r.status,
  }));
}

// Slim read for the clients list: which stage every clip is in, per client.
export async function listTaskStageRows(): Promise<{ clientId: string; type: string }[]> {
  const { data, error } = await supabase().from("tasks").select("client_id, type");
  if (error) throw error;
  return (data as { client_id: string; type: string }[]).map((r) => ({ clientId: r.client_id, type: r.type }));
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
      cover_url: values.coverUrl || null,
      start_time: values.startTime || null,
      end_time: values.endTime || null,
      shot_by: values.shotById ?? null,
      shot_team_id: values.shotTeamId ?? null,
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
  if (values.coverUrl !== undefined) patch.cover_url = values.coverUrl || null;
  if (values.startTime !== undefined) patch.start_time = values.startTime || null;
  if (values.endTime !== undefined) patch.end_time = values.endTime || null;
  if (values.editDate !== undefined) patch.edit_date = values.editDate || null;
  if (values.queueId !== undefined) patch.queue_id = values.queueId;
  if (values.shootOrder !== undefined) patch.shoot_order = values.shootOrder;
  if (values.shotById !== undefined) patch.shot_by = values.shotById;
  if (values.shotTeamId !== undefined) patch.shot_team_id = values.shotTeamId;
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

  // Entries are created once per month with the salary at that moment, so a
  // salary set or changed afterwards was never reflected. Unpaid rows follow
  // the staff member's current base salary; paid rows stay as they were paid.
  await Promise.all(
    staff.map((s) =>
      supabase()
        .from("payroll_entries")
        .update({ base_salary: s.baseSalary })
        .eq("staff_id", s.id)
        .eq("period_month", periodMonth)
        .is("paid_at", null),
    ),
  );
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
  file_url: string | null;
  share_token: string;
};

const QUOTATION_COLUMNS =
  "id, client_id, quote_no, items, vat_percent, wht_percent, status, created_at, valid_until, payment_note, notes, client_feedback, file_url, share_token";

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
  fileUrl: r.file_url ?? undefined,
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

// Doc numbers come from the next_doc_no() database function (an atomic
// per-year counter, never reused after a delete). If that migration hasn't
// been applied yet, fall back to the old count-based number so issuing a
// document never breaks.
async function nextDocNo(table: "quotations" | "receipts" | "invoices" | "contracts", prefix: string) {
  const { data, error: rpcError } = await supabase().rpc("next_doc_no", { p_kind: table, p_prefix: prefix });
  if (!rpcError && typeof data === "string") return data;

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
  issuedAt?: string; // ISO timestamp for the header date — defaults to now
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
      ...(values.issuedAt ? { created_at: values.issuedAt } : {}),
    })
    .select(QUOTATION_COLUMNS)
    .single();
  if (error) throw error;
  return fromQuotationRow(data as QuotationRow);
}

// An old quotation made elsewhere: the file is the document; one summary
// item carries the amount so list totals still work.
export async function createUploadedQuotationRow(values: {
  clientId: string;
  quoteNo: string;
  issuedAt: string;
  amount: number;
  fileUrl: string;
}): Promise<Quotation> {
  const { data, error } = await supabase()
    .from("quotations")
    .insert({
      client_id: values.clientId,
      quote_no: values.quoteNo,
      items: [{ description: "ใบเสนอราคา (ไฟล์เดิม)", qty: 1, unitPrice: values.amount }],
      vat_percent: 0,
      wht_percent: 0,
      status: "sent",
      file_url: values.fileUrl,
      created_at: values.issuedAt,
    })
    .select(QUOTATION_COLUMNS)
    .single();
  if (error) throw error;
  return fromQuotationRow(data as QuotationRow);
}

export async function updateQuotationRow(
  id: string,
  values: {
    quoteNo: string;
    clientId: string;
    items: QuotationItem[];
    vatPercent: number;
    whtPercent: number;
    issuedAt?: string;
    validUntil?: string;
    paymentNote?: string;
    notes?: string;
  },
): Promise<void> {
  const { error } = await supabase()
    .from("quotations")
    .update({
      quote_no: values.quoteNo,
      ...(values.issuedAt ? { created_at: values.issuedAt } : {}),
      client_id: values.clientId,
      items: values.items,
      vat_percent: values.vatPercent,
      wht_percent: values.whtPercent,
      valid_until: values.validUntil || null,
      payment_note: values.paymentNote ?? null,
      notes: values.notes ?? null,
    })
    .eq("id", id);
  if (error) throw error;
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
  invoice_id: string | null;
  client_package_id: string | null;
  description: string | null;
  share_token: string;
};

const RECEIPT_COLUMNS = "id, client_id, receipt_no, amount, created_at, notes, invoice_id, client_package_id, description, share_token";

const fromReceiptRow = (r: ReceiptRow): Receipt => ({
  id: r.id,
  clientId: r.client_id,
  receiptNo: r.receipt_no,
  amount: r.amount,
  createdAt: r.created_at,
  notes: r.notes ?? undefined,
  invoiceId: r.invoice_id ?? undefined,
  clientPackageId: r.client_package_id ?? undefined,
  description: r.description ?? undefined,
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
  issuedAt?: string; // ISO date the receipt is dated — defaults to now
  invoiceId?: string;
  clientPackageId?: string;
  description?: string;
  // Issue the receipt for an income entry that already exists in the books:
  // link it instead of creating a second (duplicate) income row.
  transactionId?: string;
}): Promise<Receipt> {
  const receiptNo = await nextDocNo("receipts", "RC");
  const { data, error } = await supabase()
    .from("receipts")
    .insert({
      client_id: values.clientId,
      receipt_no: receiptNo,
      amount: values.amount,
      notes: values.notes,
      invoice_id: values.invoiceId ?? null,
      client_package_id: values.clientPackageId ?? null,
      description: values.description || null,
      ...(values.issuedAt ? { created_at: values.issuedAt } : {}),
    })
    .select(RECEIPT_COLUMNS)
    .single();
  if (error) throw error;
  const receipt = fromReceiptRow(data as ReceiptRow);

  // The books: a receipt is income. Deleting the receipt removes this row
  // (transactions.receipt_id cascades).
  const { data: client } = await supabase().from("clients").select("name").eq("id", values.clientId).maybeSingle();
  const txDescription = `ใบเสร็จ ${receipt.receiptNo}${client ? ` — ${client.name}` : ""}${values.description ? ` · ${values.description}` : ""}`;
  if (values.transactionId) {
    const { error: linkError } = await supabase()
      .from("transactions")
      .update({ receipt_id: receipt.id, description: txDescription, client_id: values.clientId })
      .eq("id", values.transactionId);
    if (linkError) throw linkError;
  } else {
    const { error: txError } = await supabase().from("transactions").insert({
      type: "income",
      category: "รับชำระค่างาน",
      amount: values.amount,
      description: txDescription,
      occurred_at: (values.issuedAt ?? new Date().toISOString()).slice(0, 10),
      receipt_id: receipt.id,
      client_id: values.clientId,
    });
    if (txError) throw txError;
  }

  // Settling an invoice in full marks it paid.
  if (values.invoiceId) {
    const { data: inv } = await supabase()
      .from("invoices")
      .select("items, vat_percent, wht_percent")
      .eq("id", values.invoiceId)
      .maybeSingle();
    if (inv) {
      const total = calcQuotationTotals(inv.items as QuotationItem[], inv.vat_percent, inv.wht_percent).total;
      if (values.amount >= total) await updateInvoiceStatus(values.invoiceId, "paid");
    }
  }
  return receipt;
}

export async function deleteReceiptRow(id: string): Promise<void> {
  const { error } = await supabase().from("receipts").delete().eq("id", id);
  if (error) throw error;
}

// ── Invoices ───────────────────────────────────────────────────────────
type InvoiceRow = {
  id: string;
  client_id: string;
  invoice_no: string;
  items: QuotationItem[];
  vat_percent: number;
  wht_percent: number;
  status: Invoice["status"];
  created_at: string;
  due_date: string | null;
  payment_note: string | null;
  notes: string | null;
  share_token: string;
};

const INVOICE_COLUMNS =
  "id, client_id, invoice_no, items, vat_percent, wht_percent, status, created_at, due_date, payment_note, notes, share_token";

const fromInvoiceRow = (r: InvoiceRow): Invoice => ({
  id: r.id,
  clientId: r.client_id,
  invoiceNo: r.invoice_no,
  items: r.items,
  vatPercent: r.vat_percent,
  whtPercent: r.wht_percent,
  status: r.status,
  createdAt: r.created_at,
  dueDate: r.due_date ?? undefined,
  paymentNote: r.payment_note ?? undefined,
  notes: r.notes ?? undefined,
  shareToken: r.share_token,
});

export async function listInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase()
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as InvoiceRow[]).map(fromInvoiceRow);
}

export async function createInvoiceRow(values: {
  clientId: string;
  items: QuotationItem[];
  vatPercent: number;
  whtPercent: number;
  issuedAt?: string;
  dueDate?: string;
  paymentNote?: string;
  notes?: string;
}): Promise<Invoice> {
  const invoiceNo = await nextDocNo("invoices", "IV");
  const { data, error } = await supabase()
    .from("invoices")
    .insert({
      client_id: values.clientId,
      invoice_no: invoiceNo,
      items: values.items,
      vat_percent: values.vatPercent,
      wht_percent: values.whtPercent,
      due_date: values.dueDate || null,
      payment_note: values.paymentNote,
      notes: values.notes,
      ...(values.issuedAt ? { created_at: values.issuedAt } : {}),
    })
    .select(INVOICE_COLUMNS)
    .single();
  if (error) throw error;
  return fromInvoiceRow(data as InvoiceRow);
}

export async function updateInvoiceDate(id: string, issuedAt: string): Promise<void> {
  const { error } = await supabase().from("invoices").update({ created_at: issuedAt }).eq("id", id);
  if (error) throw error;
}

// Edit an issued receipt, and keep the income entry in the books that points
// at it (transactions.receipt_id) in step.
export async function updateReceiptRow(
  id: string,
  values: { issuedAt: string; amount: number; description?: string; notes?: string },
): Promise<void> {
  const db = supabase();
  const { data, error } = await db
    .from("receipts")
    .update({
      created_at: values.issuedAt,
      amount: values.amount,
      description: values.description || null,
      notes: values.notes || null,
    })
    .eq("id", id)
    .select("receipt_no, client_id")
    .single();
  if (error) throw error;
  const { data: client } = await db.from("clients").select("name").eq("id", data.client_id).maybeSingle();
  const { error: txError } = await db
    .from("transactions")
    .update({
      amount: values.amount,
      occurred_at: values.issuedAt.slice(0, 10),
      description: `ใบเสร็จ ${data.receipt_no}${client ? ` — ${client.name}` : ""}${values.description ? ` · ${values.description}` : ""}`,
    })
    .eq("receipt_id", id);
  if (txError) throw txError;
}

export async function updateInvoiceStatus(id: string, status: Invoice["status"]): Promise<void> {
  const { error } = await supabase().from("invoices").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteInvoiceRow(id: string): Promise<void> {
  const { error } = await supabase().from("invoices").delete().eq("id", id);
  if (error) throw error;
}

// ── Agency settings (single row — the "seller" info on printed docs) ────
type AgencySettingsRow = {
  name: string | null;
  address: string | null;
  phone: string | null;
  tax_id: string | null;
  bank_info: string | null;
  signature_url: string | null;
};

export async function getAgencySettings() {
  const { data, error } = await supabase()
    .from("agency_settings")
    .select("name, address, phone, tax_id, bank_info, signature_url")
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
    signatureUrl: r?.signature_url ?? undefined,
  };
}

export async function saveAgencySettings(values: {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  bankInfo: string;
  signatureUrl?: string;
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
      signature_url: values.signatureUrl || null,
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
  occurred_time: string | null;
  receipt_id: string | null;
  client_id: string | null;
};

const fromTransactionRow = (r: TransactionRow): Transaction => ({
  id: r.id,
  type: r.type,
  category: r.category,
  amount: r.amount,
  description: r.description ?? undefined,
  slipUrl: r.slip_url ?? undefined,
  occurredAt: r.occurred_at,
  occurredTime: r.occurred_time?.slice(0, 5) ?? undefined,
  receiptId: r.receipt_id ?? undefined,
  clientId: r.client_id ?? undefined,
});

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase()
    .from("transactions")
    .select("id, type, category, amount, description, slip_url, occurred_at, occurred_time, receipt_id, client_id")
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
      occurred_time: values.occurredTime || null,
      client_id: values.clientId ?? null,
    })
    .select("id, type, category, amount, description, slip_url, occurred_at, occurred_time, receipt_id, client_id")
    .single();
  if (error) throw error;
  return fromTransactionRow(data as TransactionRow);
}

export async function updateTransactionRow(
  id: string,
  values: Omit<Transaction, "id">,
): Promise<void> {
  const { error } = await supabase()
    .from("transactions")
    .update({
      type: values.type,
      category: values.category,
      amount: values.amount,
      description: values.description,
      slip_url: values.slipUrl,
      occurred_at: values.occurredAt,
      occurred_time: values.occurredTime || null,
      client_id: values.clientId ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

// Uploads go straight to Supabase Storage with a one-shot signed URL issued
// by /api/storage/sign (login-checked). Object names are random, so the
// public URL is unguessable.
async function uploadViaSignedUrl(bucket: "slips" | "client-brand" | "footage", file: File): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const res = await fetch("/api/storage/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, ext }),
  });
  if (!res.ok) throw new Error(`ขอลิงก์อัปโหลดไม่สำเร็จ (${res.status})`);
  const { path, token } = (await res.json()) as { path: string; token: string };
  const { error } = await supabase().storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return supabase().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Uploads a transaction slip to the public "slips" bucket and returns its URL.
// Raw footage straight into storage (the file never passes through the server).
export async function uploadFootage(file: File): Promise<string> {
  return uploadViaSignedUrl("footage", file);
}

// Pictures attached to conversation notes
export async function uploadNoteImage(file: File): Promise<string> {
  return uploadViaSignedUrl("client-brand", file);
}

export async function uploadSlip(file: File): Promise<string> {
  return uploadViaSignedUrl("slips", file);
}

export async function uploadTaskCover(file: File): Promise<string> {
  return uploadClientBrandImage(file);
}

export async function uploadClientBrandImage(file: File): Promise<string> {
  return uploadViaSignedUrl("client-brand", file);
}

export async function setClientBrandImages(id: string, images: string[]): Promise<void> {
  const { error } = await supabase().from("clients").update({ brand_images: images }).eq("id", id);
  if (error) throw error;
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
  clip_count: number;
};

const PACKAGE_COLUMNS = "id, name, description, price, start_date, end_date, clip_count";

const fromPackageRow = (r: PackageRow): Package => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  price: r.price,
  startDate: r.start_date ?? undefined,
  endDate: r.end_date ?? undefined,
  clipCount: r.clip_count,
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
      clip_count: values.clipCount,
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
      clip_count: values.clipCount,
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
  amount: number;
};

const fromClientPackageRow = (r: ClientPackageRow): ClientPackage => ({
  id: r.id,
  clientId: r.client_id,
  packageId: r.package_id,
  assignedAt: r.assigned_at,
  amount: r.amount,
});

export async function listClientPackages(): Promise<ClientPackage[]> {
  const { data, error } = await supabase()
    .from("client_packages")
    .select("id, client_id, package_id, assigned_at, amount")
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data as ClientPackageRow[]).map(fromClientPackageRow);
}

// Latest client_packages row per client = the current "billing round".
export async function listCurrentClientRounds(): Promise<Record<string, ClientPackage>> {
  const all = await listClientPackages();
  const out: Record<string, ClientPackage> = {};
  for (const cp of all) {
    if (!out[cp.clientId]) out[cp.clientId] = cp; // already sorted newest-first
  }
  return out;
}

// Record a payment against a billing round: a receipt linked to that round
// (feeds the books automatically, same as any other receipt).
export async function recordRoundPayment(values: {
  clientId: string;
  clientPackageId: string;
  amount: number;
  notes?: string;
}): Promise<Receipt> {
  return createReceiptRow({
    clientId: values.clientId,
    amount: values.amount,
    notes: values.notes,
    clientPackageId: values.clientPackageId,
  });
}

// Assigning a package starts a new billing round for the client (amount
// snapshots the package's current price, so a later price change doesn't
// retroactively change what this round billed) and auto-issues a quotation
// for it. Clips/tasks are added by hand — nothing is created automatically.
export async function assignPackageToClient(clientId: string, packageId: string): Promise<ClientPackage> {
  const db = supabase();
  const { data: pkg } = await db.from("packages").select("name, price").eq("id", packageId).single();
  if (!pkg) throw new Error("ไม่พบแพ็คเกจนี้");

  const { data, error } = await db
    .from("client_packages")
    .insert({ client_id: clientId, package_id: packageId, amount: pkg.price })
    .select("id, client_id, package_id, assigned_at, amount")
    .single();
  if (error) throw error;

  await createQuotationRow({
    clientId,
    items: [{ description: pkg.name, qty: 1, unitPrice: pkg.price }],
    vatPercent: 0,
    whtPercent: 0,
  });

  return fromClientPackageRow(data as ClientPackageRow);
}

export async function unassignClientPackage(id: string): Promise<void> {
  const { error } = await supabase().from("client_packages").delete().eq("id", id);
  if (error) throw error;
}

// ── Client call/contact log ───────────────────────────────────────────
type ClientNoteRow = {
  id: string;
  client_id: string;
  note: string;
  note_date: string;
  created_at: string;
  deleted_at: string | null;
  talked_by: string | null;
  images: string[] | null;
};

const CLIENT_NOTE_COLUMNS = "id, client_id, note, note_date, created_at, deleted_at, talked_by, images";

const fromClientNoteRow = (r: ClientNoteRow): ClientNote => ({
  id: r.id,
  clientId: r.client_id,
  note: r.note,
  noteDate: r.note_date,
  createdAt: r.created_at,
  deletedAt: r.deleted_at,
  talkedBy: r.talked_by,
  images: r.images ?? [],
});

export async function listClientNotes(clientId: string): Promise<ClientNote[]> {
  const { data, error } = await supabase()
    .from("client_notes")
    .select(CLIENT_NOTE_COLUMNS)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("note_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ClientNoteRow[]).map(fromClientNoteRow);
}

// Latest note per client, for the table's preview column — one query for
// all clients instead of one per row.
export async function listLatestClientNotes(): Promise<Record<string, ClientNote>> {
  const { data, error } = await supabase()
    .from("client_notes")
    .select(CLIENT_NOTE_COLUMNS)
    .is("deleted_at", null)
    .order("note_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const out: Record<string, ClientNote> = {};
  for (const row of data as ClientNoteRow[]) {
    if (!out[row.client_id]) out[row.client_id] = fromClientNoteRow(row);
  }
  return out;
}

export async function createClientNoteRow(clientId: string, note: string, noteDate: string, talkedBy?: string | null, images: string[] = []): Promise<ClientNote> {
  const { data, error } = await supabase()
    .from("client_notes")
    .insert({ client_id: clientId, note, note_date: noteDate, talked_by: talkedBy ?? null, images })
    .select(CLIENT_NOTE_COLUMNS)
    .single();
  if (error) throw error;
  return fromClientNoteRow(data as ClientNoteRow);
}

export async function updateClientNoteRow(id: string, values: { note: string; noteDate: string; talkedBy?: string | null; images?: string[] }): Promise<void> {
  const { error } = await supabase()
    .from("client_notes")
    .update({ note: values.note, note_date: values.noteDate, ...(values.talkedBy !== undefined ? { talked_by: values.talkedBy } : {}), ...(values.images !== undefined ? { images: values.images } : {}) })
    .eq("id", id);
  if (error) throw error;
}

// Soft delete — the row moves to the trash (Settings) instead of vanishing.
export async function trashClientNoteRow(id: string): Promise<void> {
  const { error } = await supabase().from("client_notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function listTrashedClientNotes(): Promise<(ClientNote & { clientName: string })[]> {
  const { data, error } = await supabase()
    .from("client_notes")
    .select(`${CLIENT_NOTE_COLUMNS}, clients ( name )`)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data as (ClientNoteRow & { clients: { name: string } | { name: string }[] | null })[]).map((r) => ({
    ...fromClientNoteRow(r),
    clientName: (Array.isArray(r.clients) ? r.clients[0]?.name : r.clients?.name) ?? "—",
  }));
}

export async function restoreClientNoteRow(id: string): Promise<void> {
  const { error } = await supabase().from("client_notes").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function permanentlyDeleteClientNoteRow(id: string): Promise<void> {
  const { error } = await supabase().from("client_notes").delete().eq("id", id);
  if (error) throw error;
}

// ── Task settings (owner-configurable types + status colors) ───────────
export async function getTaskSettings(): Promise<TaskSettings> {
  const { mergeTaskSettings } = await import("@/lib/taskSettings");
  const { data, error } = await supabase()
    .from("task_settings")
    .select("types, status_colors")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return mergeTaskSettings(
    data ? { types: data.types ?? undefined, statusColors: data.status_colors ?? undefined } : null,
  );
}

export async function saveTaskSettings(values: TaskSettings): Promise<void> {
  const { error } = await supabase()
    .from("task_settings")
    .upsert({ id: true, types: values.types, status_colors: values.statusColors });
  if (error) throw error;
}

// Bulk-create tasks named "<client>-<n>" (n = startAt … startAt+count-1).
export async function createTasksBulk(values: {
  clientId: string;
  clientName: string;
  count: number;
  startAt: number;
  type: string;
  scheduledDate: string;
  dueDate: string;
}): Promise<number> {
  const rows = Array.from({ length: values.count }, (_, i) => ({
    client_id: values.clientId,
    title: `${values.clientName}-${values.startAt + i}`,
    type: values.type,
    status: defaultStatusFor(values.type),
    scheduled_date: values.scheduledDate,
    due_date: values.dueDate,
  }));
  const { error } = await supabase().from("tasks").insert(rows);
  if (error) throw error;
  return rows.length;
}

export type ContentSetItem = { title: string; script: string; ref: string };
export type ContentSet = { id: string; name: string; items: ContentSetItem[] };

export async function listContentSets(): Promise<ContentSet[]> {
  const { data, error } = await supabase()
    .from("content_sets")
    .select("id, name, items")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, items: (r.items ?? []) as ContentSetItem[] }));
}

export async function saveContentSet(
  values: { name: string; items: ContentSetItem[] },
  id?: string,
): Promise<ContentSet> {
  const q = id
    ? supabase().from("content_sets").update(values).eq("id", id)
    : supabase().from("content_sets").insert(values);
  const { data, error } = await q.select("id, name, items").single();
  if (error) throw error;
  return { id: data.id, name: data.name, items: (data.items ?? []) as ContentSetItem[] };
}

export async function deleteContentSet(id: string): Promise<void> {
  const { error } = await supabase().from("content_sets").delete().eq("id", id);
  if (error) throw error;
}

// Stamp a content set onto a client: one task per item, titled with the item name.
export async function createTasksFromSet(values: {
  clientId: string;
  clientName: string;
  items: ContentSetItem[];
  type: string;
  scheduledDate: string;
  dueDate: string;
}): Promise<number> {
  const rows = values.items.map((it) => ({
    client_id: values.clientId,
    title: it.title.trim() || values.clientName,
    type: values.type,
    status: defaultStatusFor(values.type),
    scheduled_date: values.scheduledDate,
    due_date: values.dueDate,
    script_text: it.script || null,
    ref_link: it.ref || null,
  }));
  if (!rows.length) return 0;
  const { error } = await supabase().from("tasks").insert(rows);
  if (error) throw error;
  return rows.length;
}

// ── Contracts ──────────────────────────────────────────────────────────
type ContractRow = {
  id: string;
  contract_no: string;
  client_id: string;
  status: Contract["status"];
  title: string;
  sign_date: string;
  start_date: string | null;
  end_date: string | null;
  package_name: string | null;
  total_amount: number;
  installments: ContractInstallment[];
  parties: Contract["parties"];
  intro: string;
  clauses: Contract["clauses"];
  closing: string;
  share_token: string;
  seller_signature_url: string | null;
  client_signer_name: string | null;
  client_signature_url: string | null;
  client_signed_at: string | null;
  client_sign_ip: string | null;
  content_hash: string | null;
  created_at: string;
};

export const CONTRACT_COLUMNS =
  "id, contract_no, client_id, status, title, sign_date, start_date, end_date, package_name, total_amount, installments, parties, intro, clauses, closing, share_token, seller_signature_url, client_signer_name, client_signature_url, client_signed_at, client_sign_ip, content_hash, created_at";

export const fromContractRow = (r: ContractRow): Contract => ({
  id: r.id,
  contractNo: r.contract_no,
  clientId: r.client_id,
  status: r.status,
  title: r.title,
  signDate: r.sign_date,
  startDate: r.start_date ?? undefined,
  endDate: r.end_date ?? undefined,
  packageName: r.package_name ?? undefined,
  totalAmount: Number(r.total_amount),
  installments: r.installments ?? [],
  parties: r.parties,
  intro: r.intro,
  clauses: r.clauses ?? [],
  closing: r.closing,
  shareToken: r.share_token,
  sellerSignatureUrl: r.seller_signature_url ?? undefined,
  clientSignerName: r.client_signer_name ?? undefined,
  clientSignatureUrl: r.client_signature_url ?? undefined,
  clientSignedAt: r.client_signed_at ?? undefined,
  clientSignIp: r.client_sign_ip ?? undefined,
  contentHash: r.content_hash ?? undefined,
  createdAt: r.created_at,
});

export async function getContractTemplate(): Promise<ContractTemplate> {
  const { data, error } = await supabase().from("contract_template").select("content").eq("id", true).maybeSingle();
  if (error) throw error;
  return (data?.content as ContractTemplate | undefined) ?? DEFAULT_CONTRACT_TEMPLATE;
}

export async function saveContractTemplate(content: ContractTemplate): Promise<void> {
  const { error } = await supabase()
    .from("contract_template")
    .upsert({ id: true, content, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function listContracts(): Promise<Contract[]> {
  const { data, error } = await supabase()
    .from("contracts")
    .select(CONTRACT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ContractRow[]).map(fromContractRow);
}

export async function getContract(id: string): Promise<Contract | null> {
  const { data, error } = await supabase().from("contracts").select(CONTRACT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromContractRow(data as ContractRow) : null;
}

// Copy the template into a new draft contract: parties are snapshotted from
// the client + agency settings, {{variables}} are filled in, "[ระบุ…]"
// placeholders stay for the editor.
export async function createContractFromTemplate(values: {
  clientId: string;
  signDate: string;
  startDate?: string;
  endDate?: string;
  packageName?: string;
  totalAmount: number;
  installments: ContractInstallment[];
}): Promise<Contract> {
  const db = supabase();
  const [template, agency, { data: client, error: clientError }] = await Promise.all([
    getContractTemplate(),
    getAgencySettings(),
    db.from("clients").select("name, billing_name, address, tax_id, phone").eq("id", values.clientId).single(),
  ]);
  if (clientError || !client) throw clientError ?? new Error("ไม่พบลูกค้า");

  const clientParty: ContractParty = {
    name: client.billing_name || client.name,
    address: client.address ?? "",
    taxId: client.tax_id ?? "",
    phone: client.phone ?? "",
  };
  const sellerParty: ContractParty = {
    name: agency.name,
    address: agency.address,
    taxId: agency.taxId,
    phone: agency.phone,
  };
  const vars = {
    signDate: values.signDate,
    startDate: values.startDate,
    endDate: values.endDate,
    packageName: values.packageName,
    total: values.totalAmount,
    installments: values.installments,
    bank: agency.bankInfo || undefined,
    client: clientParty,
    seller: sellerParty,
  };
  const fill = (t: string) => fillVariables(t, vars);

  const contractNo = await nextDocNo("contracts", "CT");
  const { data, error } = await db
    .from("contracts")
    .insert({
      contract_no: contractNo,
      client_id: values.clientId,
      title: template.title,
      sign_date: values.signDate,
      start_date: values.startDate || null,
      end_date: values.endDate || null,
      package_name: values.packageName || null,
      total_amount: values.totalAmount,
      installments: values.installments,
      parties: { seller: sellerParty, client: clientParty, bank: agency.bankInfo || undefined },
      intro: fill(template.intro),
      clauses: template.clauses.map((c) => ({ heading: c.heading, body: fill(c.body) })),
      closing: fill(template.closing),
      seller_signature_url: agency.signatureUrl ?? null,
    })
    .select(CONTRACT_COLUMNS)
    .single();
  if (error) throw error;
  return fromContractRow(data as ContractRow);
}

export async function updateContractRow(
  id: string,
  values: Pick<Contract, "title" | "signDate" | "startDate" | "endDate" | "packageName" | "totalAmount" | "installments" | "parties" | "intro" | "clauses" | "closing">,
): Promise<void> {
  const { error } = await supabase()
    .from("contracts")
    .update({
      title: values.title,
      sign_date: values.signDate,
      start_date: values.startDate || null,
      end_date: values.endDate || null,
      package_name: values.packageName || null,
      total_amount: values.totalAmount,
      installments: values.installments,
      parties: values.parties,
      intro: values.intro,
      clauses: values.clauses,
      closing: values.closing,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setContractStatus(id: string, status: "draft" | "sent"): Promise<void> {
  const { error } = await supabase().from("contracts").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteContractRow(id: string): Promise<void> {
  const { error } = await supabase().from("contracts").delete().eq("id", id);
  if (error) throw error;
}

// ── Revisions & notifications ───────────────────────────────────────────
export type TaskRevision = { id: string; round: number; brief: string; source: "client" | "qc"; createdAt: string };

export async function listTaskRevisions(taskId: string): Promise<TaskRevision[]> {
  const { data, error } = await supabase()
    .from("task_revisions")
    .select("id, round, brief, source, created_at")
    .eq("task_id", taskId)
    .order("round", { ascending: false });
  if (error) throw error;
  return (data as { id: string; round: number; brief: string; source: "client" | "qc"; created_at: string }[]).map((r) => ({
    id: r.id,
    round: r.round,
    brief: r.brief,
    source: r.source,
    createdAt: r.created_at,
  }));
}

export type AppNotification = {
  id: string;
  kind: string;
  taskId: string | null;
  clientId: string | null;
  title: string;
  body: string | null;
  count: number;
  createdAt: string;
  readAt: string | null;
};

// The proxy pins this to the signed-in person, whatever filter is sent.
export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase()
    .from("notifications")
    .select("id, kind, task_id, client_id, title, body, count, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (
    data as {
      id: string;
      kind: string;
      task_id: string | null;
      client_id: string | null;
      title: string;
      body: string | null;
      count: number;
      created_at: string;
      read_at: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    kind: r.kind,
    taskId: r.task_id,
    clientId: r.client_id,
    title: r.title,
    body: r.body,
    count: r.count,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
}

export async function markNotificationsRead(ids: string[] | "all"): Promise<void> {
  let q = supabase().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (ids !== "all") {
    if (ids.length === 0) return;
    q = q.in("id", ids);
  }
  const { error } = await q;
  if (error) throw error;
}

// ── LINE digest channels (owner only; the proxy enforces it) ────────────
export type LineChannel = {
  id: string;
  name: string;
  groupId: string;
  sendHour: number;
  topics: string[];
  teamId: string | null;
  enabled: boolean;
};
type LineChannelRow = { id: string; name: string; group_id: string; send_hour: number; topics: string[]; team_id: string | null; enabled: boolean };
const LINE_CHANNEL_COLUMNS = "id, name, group_id, send_hour, topics, team_id, enabled";
const fromLineChannelRow = (r: LineChannelRow): LineChannel => ({
  id: r.id,
  name: r.name,
  groupId: r.group_id,
  sendHour: r.send_hour,
  topics: r.topics,
  teamId: r.team_id,
  enabled: r.enabled,
});

export async function listLineChannels(): Promise<LineChannel[]> {
  const { data, error } = await supabase().from("line_channels").select(LINE_CHANNEL_COLUMNS).order("created_at");
  if (error) throw error;
  return (data as LineChannelRow[]).map(fromLineChannelRow);
}

export async function saveLineChannel(values: Omit<LineChannel, "id"> & { id?: string }): Promise<LineChannel> {
  const row = {
    name: values.name.trim(),
    group_id: values.groupId.trim(),
    send_hour: values.sendHour,
    topics: values.topics,
    team_id: values.teamId,
    enabled: values.enabled,
  };
  const q = values.id
    ? supabase().from("line_channels").update(row).eq("id", values.id)
    : supabase().from("line_channels").insert(row);
  const { data, error } = await q.select(LINE_CHANNEL_COLUMNS).single();
  if (error) throw error;
  return fromLineChannelRow(data as LineChannelRow);
}

export async function deleteLineChannel(id: string): Promise<void> {
  const { error } = await supabase().from("line_channels").delete().eq("id", id);
  if (error) throw error;
}

// ── Queues (shoot batches) ───────────────────────────────────────────────
type QueueRow = { id: string; client_id: string; name: string; shoot_date: string | null; edit_date: string | null; crew: string[] | null; note: string | null };
const QUEUE_COLUMNS = "id, client_id, name, shoot_date, edit_date, crew, note";
const fromQueueRow = (r: QueueRow): Queue => ({
  id: r.id,
  clientId: r.client_id,
  name: r.name,
  shootDate: r.shoot_date ?? undefined,
  editDate: r.edit_date ?? undefined,
  crew: r.crew ?? [],
  note: r.note ?? undefined,
});

export async function listQueues(clientId?: string): Promise<Queue[]> {
  let q = supabase().from("queues").select(QUEUE_COLUMNS).order("shoot_date", { ascending: true, nullsFirst: false }).order("created_at");
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as QueueRow[]).map(fromQueueRow);
}

export async function saveQueue(values: Omit<Queue, "id"> & { id?: string }): Promise<Queue> {
  const row = {
    client_id: values.clientId,
    name: values.name.trim(),
    shoot_date: values.shootDate || null,
    edit_date: values.editDate || null,
    crew: values.crew,
    note: values.note?.trim() || null,
  };
  const q = values.id ? supabase().from("queues").update(row).eq("id", values.id) : supabase().from("queues").insert(row);
  const { data, error } = await q.select(QUEUE_COLUMNS).single();
  if (error) throw error;
  return fromQueueRow(data as QueueRow);
}

// Clips in the queue go back to "waiting for a queue" (queue_id set null by the FK).
export async function deleteQueue(id: string): Promise<void> {
  const { error } = await supabase().from("queues").delete().eq("id", id);
  if (error) throw error;
}
