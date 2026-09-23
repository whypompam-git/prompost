export type PaymentStatus = "unpaid" | "deposit" | "paid";
export type EntityType = "company" | "individual";

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  colorTag: string; // tailwind color stem used for calendar column accent, e.g. "orange"
  paymentStatus: PaymentStatus;
  portalToken: string;
  address?: string; // printed on quotations/receipts as the buyer's address
  entityType: EntityType; // controls the taxId field's printed label
  taxId?: string; // "เลขทะเบียนนิติบุคคล" (company) or "เลขประจำตัวผู้เสียภาษี" (individual)
}

export interface Staff {
  id: string;
  name: string;
  position: string;
  avatarColor: string;
  phone?: string;
  email?: string;
  hireDate?: string; // ISO date
  baseSalary: number;
}

export type TaskType = "shoot" | "edit" | "review" | "deliver" | "other";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type ContentCategory = "mass" | "royalty" | "sell";

export interface Task {
  id: string;
  clientId: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  assigneeId: string | null;
  scheduledDate: string; // ISO date — "วันที่ถ่าย"
  dueDate: string; // ISO date
  notes?: string;
  footageUrl?: string; // Google Drive link — raw footage from the shoot
  refLink?: string; // Ref Link Video
  contentCategory?: ContentCategory; // Mass / Royalty / Sell
  scriptText?: string; // typed in-app; **bold** / __underline__ markers, see ScriptEditor
  shots?: string[]; // free-typed, remembered/suggested across tasks
  equipment?: string[]; // free-typed, remembered/suggested across tasks
  postDate?: string; // ISO date — "วันที่โพส"
  finalUrl?: string; // Google Drive link — final delivered video
  startTime?: string; // "HH:mm" — optional, like Google Calendar's timed vs all-day
  endTime?: string; // "HH:mm"
}

export type LeaveType = "personal" | "sick" | "vacation";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  staffId: string;
  dateFrom: string; // ISO date
  dateTo: string; // ISO date
  leaveType: LeaveType;
  status: LeaveStatus;
  note?: string;
}

export interface PayrollEntry {
  id: string;
  staffId: string;
  periodMonth: string; // ISO date, first of the month
  baseSalary: number;
  bonus: number;
  deductions: number;
  paidAt: string | null; // ISO date, null = not yet paid
}

export interface QuotationItem {
  description: string;
  qty: number;
  unitPrice: number;
}

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected";

export interface Quotation {
  id: string;
  clientId: string;
  quoteNo: string;
  items: QuotationItem[];
  vatPercent: number;
  whtPercent: number;
  status: QuotationStatus;
  createdAt: string; // ISO date
  validUntil?: string; // ISO date — ยืนราคาถึง
  paymentNote?: string; // ช่องทางการชำระเงิน
  notes?: string;
  clientFeedback?: string; // client's requested changes, left via the share link
  shareToken: string; // /quote/:shareToken — public read + feedback link
}

export interface Receipt {
  id: string;
  clientId: string;
  receiptNo: string;
  amount: number;
  createdAt: string; // ISO date
  notes?: string;
  shareToken: string; // /receipt/:shareToken
}

export interface AgencySettings {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  bankInfo: string;
}

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
  slipUrl?: string; // local object URL preview until real storage is wired up
  occurredAt: string; // ISO date
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  startDate?: string; // ISO date — package's own promo/validity window
  endDate?: string;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  packageId: string;
  assignedAt: string; // ISO date
}
