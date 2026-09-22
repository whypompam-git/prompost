import type { Client, Staff, Task } from "./types";

export const mockClients: Client[] = [
  { id: "c1", name: "Siam Coffee Co.", contactName: "คุณมิ้นท์", phone: "0891234567", colorTag: "orange", paymentStatus: "paid", portalToken: "tok-siam-coffee" },
  { id: "c2", name: "Baan Suan Resort", contactName: "คุณเอก", phone: "0891234568", colorTag: "sky", paymentStatus: "deposit", portalToken: "tok-baan-suan" },
  { id: "c3", name: "NeoFit Gym", contactName: "คุณต้า", phone: "0891234569", colorTag: "emerald", paymentStatus: "unpaid", portalToken: "tok-neofit" },
  { id: "c4", name: "Luna Skincare", contactName: "คุณอิง", phone: "0891234570", colorTag: "violet", paymentStatus: "paid", portalToken: "tok-luna" },
];

export const mockStaff: Staff[] = [
  { id: "s1", name: "แนน", position: "Content Creator", avatarColor: "bg-orange-500" },
  { id: "s2", name: "ปั้น", position: "Video Editor", avatarColor: "bg-sky-500" },
  { id: "s3", name: "ฝ้าย", position: "Photographer", avatarColor: "bg-emerald-500" },
  { id: "s4", name: "บอส", position: "Account Manager", avatarColor: "bg-violet-500" },
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
