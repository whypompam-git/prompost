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
}
