export type PaymentStatus = "unpaid" | "deposit" | "paid";

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  colorTag: string; // tailwind color stem used for calendar column accent, e.g. "orange"
  paymentStatus: PaymentStatus;
  portalToken: string;
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

export interface Task {
  id: string;
  clientId: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  assigneeId: string | null;
  scheduledDate: string; // ISO date, used for the calendar matrix
  dueDate: string; // ISO date
  notes?: string;
  scriptUrl?: string; // Google Drive link — client reviews the script
  footageUrl?: string; // Google Drive link — final delivered footage
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
}

export interface Receipt {
  id: string;
  clientId: string;
  receiptNo: string;
  amount: number;
  createdAt: string; // ISO date
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
