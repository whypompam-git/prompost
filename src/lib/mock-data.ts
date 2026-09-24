import { ALL_PERMISSIONS, NO_PERMISSIONS } from "./permissions";
import type {
  Client,
  LeaveRequest,
  PayrollEntry,
  Quotation,
  Receipt,
  Staff,
  Task,
  Transaction,
} from "./types";

export const mockClients: Client[] = [
  { id: "c1", name: "Siam Coffee Co.", contactName: "คุณมิ้นท์", phone: "0891234567", colorTag: "orange", paymentStatus: "paid", portalToken: "tok-siam-coffee", entityType: "company" },
  { id: "c2", name: "Baan Suan Resort", contactName: "คุณเอก", phone: "0891234568", colorTag: "sky", paymentStatus: "deposit", portalToken: "tok-baan-suan", entityType: "company" },
  { id: "c3", name: "NeoFit Gym", contactName: "คุณต้า", phone: "0891234569", colorTag: "emerald", paymentStatus: "unpaid", portalToken: "tok-neofit", entityType: "individual" },
  { id: "c4", name: "Luna Skincare", contactName: "คุณอิง", phone: "0891234570", colorTag: "violet", paymentStatus: "paid", portalToken: "tok-luna", entityType: "individual" },
];

export const mockStaff: Staff[] = [
  { id: "s1", name: "แนน", position: "Content Creator", avatarColor: "bg-orange-500", phone: "0812223331", email: "nan@prompost.agency", hireDate: "2024-03-01", baseSalary: 22000, role: "staff", permissions: NO_PERMISSIONS },
  { id: "s2", name: "ปั้น", position: "Video Editor", avatarColor: "bg-sky-500", phone: "0812223332", email: "pun@prompost.agency", hireDate: "2023-11-15", baseSalary: 26000, role: "staff", permissions: NO_PERMISSIONS },
  { id: "s3", name: "ฝ้าย", position: "Photographer", avatarColor: "bg-emerald-500", phone: "0812223333", email: "fai@prompost.agency", hireDate: "2024-06-01", baseSalary: 24000, role: "staff", permissions: NO_PERMISSIONS },
  { id: "s4", name: "บอส", position: "Account Manager", avatarColor: "bg-violet-500", phone: "0812223334", email: "boss@prompost.agency", hireDate: "2022-09-10", baseSalary: 32000, role: "owner", permissions: ALL_PERMISSIONS },
];

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const mockTasks: Task[] = [
  { id: "t1", clientId: "c1", title: "ถ่ายภาพสินค้าใหม่ประจำเดือน", type: "shoot", status: "in_progress", assigneeId: "s3", scheduledDate: iso(1), dueDate: iso(3), notes: "นัดถ่ายที่ร้านสาขาสยาม 10:00 น." },
  { id: "t2", clientId: "c1", title: "ตัดต่อรีลโปรโมชั่น", type: "edit", status: "todo", assigneeId: "s2", scheduledDate: iso(4), dueDate: iso(6) },
  { id: "t3", clientId: "c2", title: "ถ่ายวิดีโอรีวิวห้องพัก", type: "shoot", status: "review", assigneeId: "s3", scheduledDate: iso(-1), dueDate: iso(2) },
  { id: "t4", clientId: "c2", title: "ส่งมอบคลิปให้ลูกค้า", type: "deliver", status: "todo", assigneeId: "s4", scheduledDate: iso(7), dueDate: iso(7) },
  { id: "t5", clientId: "c3", title: "คอนเทนต์ตารางออกกำลังกายรายสัปดาห์", type: "edit", status: "done", assigneeId: "s1", scheduledDate: iso(-2), dueDate: iso(-1) },
  { id: "t6", clientId: "c3", title: "ถ่ายคลาสเทรนเนอร์คนใหม่", type: "shoot", status: "todo", assigneeId: "s3", scheduledDate: iso(5), dueDate: iso(8) },
  { id: "t7", clientId: "c4", title: "รีวิวสคริปต์ก่อนถ่าย", type: "review", status: "in_progress", assigneeId: "s1", scheduledDate: iso(2), dueDate: iso(2) },
  { id: "t8", clientId: "c4", title: "ส่งมอบภาพนิ่งแคมเปญ", type: "deliver", status: "done", assigneeId: "s4", scheduledDate: iso(-3), dueDate: iso(-2) },
  { id: "t9", clientId: "c1", title: "ประชุมวางแผนคอนเทนต์เดือนหน้า", type: "other", status: "todo", assigneeId: "s4", scheduledDate: iso(9), dueDate: iso(9) },
  { id: "t10", clientId: "c2", title: "ตัดต่อวิดีโอรีวิวห้องพัก", type: "edit", status: "in_progress", assigneeId: "s2", scheduledDate: iso(3), dueDate: iso(5) },
];

const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

export const mockLeaveRequests: LeaveRequest[] = [
  { id: "l1", staffId: "s3", dateFrom: iso(6), dateTo: iso(6), leaveType: "personal", status: "approved", note: "ธุระส่วนตัว" },
  { id: "l2", staffId: "s2", dateFrom: iso(10), dateTo: iso(11), leaveType: "vacation", status: "pending" },
];

export const mockPayrollEntries: PayrollEntry[] = mockStaff.map((s, i) => ({
  id: `p${i + 1}`,
  staffId: s.id,
  periodMonth: thisMonthStart,
  baseSalary: s.baseSalary,
  bonus: 0,
  deductions: 0,
  paidAt: null,
}));

export const mockQuotations: Quotation[] = [
  {
    id: "q1",
    clientId: "c1",
    quoteNo: "QT2569-001",
    items: [
      { description: "ถ่ายภาพสินค้า (1 วัน)", qty: 1, unitPrice: 8000 },
      { description: "ตัดต่อรีลโปรโมชั่น 3 คลิป", qty: 3, unitPrice: 2500 },
    ],
    vatPercent: 7,
    whtPercent: 3,
    status: "sent",
    createdAt: iso(-5),
    shareToken: "tok-q1",
  },
];

export const mockReceipts: Receipt[] = [
  { id: "r1", clientId: "c4", receiptNo: "RC2569-014", amount: 18500, createdAt: iso(-2), shareToken: "tok-r1" },
];

export const mockTransactions: Transaction[] = [
  { id: "tx1", type: "income", category: "รับชำระค่างาน", amount: 18500, description: "Luna Skincare — แคมเปญภาพนิ่ง", occurredAt: iso(-2) },
  { id: "tx2", type: "expense", category: "อุปกรณ์ถ่ายทำ", amount: 3200, description: "เช่าไฟสตูดิโอเพิ่ม", occurredAt: iso(-4) },
  { id: "tx3", type: "expense", category: "เดินทาง", amount: 450, description: "ค่าน้ำมันไปถ่ายงาน Baan Suan Resort", occurredAt: iso(-1) },
];
