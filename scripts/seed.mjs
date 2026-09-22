// One-off/reusable seed script — inserts the same sample dataset that
// src/lib/mock-data.ts uses for local dev, but into the real database.
// Requires SUPABASE_SECRET_KEY (bypasses RLS) since it writes directly.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/seed.mjs
//
// Safe to re-run: it only inserts if the clients table is currently empty.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const today = new Date();
const iso = (offsetDays) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

async function main() {
  const { count } = await supabase.from("clients").select("id", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`clients already has ${count} row(s) — skipping seed.`);
    return;
  }

  const { data: clients, error: clientErr } = await supabase
    .from("clients")
    .insert([
      { name: "Siam Coffee Co.", contact_name: "คุณมิ้นท์", phone: "0891234567", color_tag: "orange", payment_status: "paid" },
      { name: "Baan Suan Resort", contact_name: "คุณเอก", phone: "0891234568", color_tag: "sky", payment_status: "deposit" },
      { name: "NeoFit Gym", contact_name: "คุณต้า", phone: "0891234569", color_tag: "emerald", payment_status: "unpaid" },
      { name: "Luna Skincare", contact_name: "คุณอิง", phone: "0891234570", color_tag: "violet", payment_status: "paid" },
    ])
    .select("id, name");
  if (clientErr) throw clientErr;
  const clientId = Object.fromEntries(clients.map((c) => [c.name, c.id]));

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .insert([
      { name: "แนน", position: "Content Creator", avatar_color: "bg-orange-500", phone: "0812223331", email: "nan@prompost.agency", hire_date: "2024-03-01", base_salary: 22000 },
      { name: "ปั้น", position: "Video Editor", avatar_color: "bg-sky-500", phone: "0812223332", email: "pun@prompost.agency", hire_date: "2023-11-15", base_salary: 26000 },
      { name: "ฝ้าย", position: "Photographer", avatar_color: "bg-emerald-500", phone: "0812223333", email: "fai@prompost.agency", hire_date: "2024-06-01", base_salary: 24000 },
      { name: "บอส", position: "Account Manager", avatar_color: "bg-violet-500", phone: "0812223334", email: "boss@prompost.agency", hire_date: "2022-09-10", base_salary: 32000 },
    ])
    .select("id, name");
  if (staffErr) throw staffErr;
  const staffId = Object.fromEntries(staff.map((s) => [s.name, s.id]));

  const { error: taskErr } = await supabase.from("tasks").insert([
    { client_id: clientId["Siam Coffee Co."], title: "ถ่ายภาพสินค้าใหม่ประจำเดือน", type: "shoot", status: "in_progress", assignee_id: staffId["ฝ้าย"], scheduled_date: iso(1), due_date: iso(3), notes: "นัดถ่ายที่ร้านสาขาสยาม 10:00 น." },
    { client_id: clientId["Siam Coffee Co."], title: "ตัดต่อรีลโปรโมชั่น", type: "edit", status: "todo", assignee_id: staffId["ปั้น"], scheduled_date: iso(4), due_date: iso(6) },
    { client_id: clientId["Baan Suan Resort"], title: "ถ่ายวิดีโอรีวิวห้องพัก", type: "shoot", status: "review", assignee_id: staffId["ฝ้าย"], scheduled_date: iso(-1), due_date: iso(2) },
    { client_id: clientId["Baan Suan Resort"], title: "ส่งมอบคลิปให้ลูกค้า", type: "deliver", status: "todo", assignee_id: staffId["บอส"], scheduled_date: iso(7), due_date: iso(7) },
    { client_id: clientId["NeoFit Gym"], title: "คอนเทนต์ตารางออกกำลังกายรายสัปดาห์", type: "edit", status: "done", assignee_id: staffId["แนน"], scheduled_date: iso(-2), due_date: iso(-1) },
    { client_id: clientId["NeoFit Gym"], title: "ถ่ายคลาสเทรนเนอร์คนใหม่", type: "shoot", status: "todo", assignee_id: staffId["ฝ้าย"], scheduled_date: iso(5), due_date: iso(8) },
    { client_id: clientId["Luna Skincare"], title: "รีวิวสคริปต์ก่อนถ่าย", type: "review", status: "in_progress", assignee_id: staffId["แนน"], scheduled_date: iso(2), due_date: iso(2) },
    { client_id: clientId["Luna Skincare"], title: "ส่งมอบภาพนิ่งแคมเปญ", type: "deliver", status: "done", assignee_id: staffId["บอส"], scheduled_date: iso(-3), due_date: iso(-2) },
    { client_id: clientId["Siam Coffee Co."], title: "ประชุมวางแผนคอนเทนต์เดือนหน้า", type: "other", status: "todo", assignee_id: staffId["บอส"], scheduled_date: iso(9), due_date: iso(9) },
    { client_id: clientId["Baan Suan Resort"], title: "ตัดต่อวิดีโอรีวิวห้องพัก", type: "edit", status: "in_progress", assignee_id: staffId["ปั้น"], scheduled_date: iso(3), due_date: iso(5) },
  ]);
  if (taskErr) throw taskErr;

  const { error: leaveErr } = await supabase.from("leave_requests").insert([
    { staff_id: staffId["ฝ้าย"], date_from: iso(6), date_to: iso(6), leave_type: "personal", status: "approved", note: "ธุระส่วนตัว" },
    { staff_id: staffId["ปั้น"], date_from: iso(10), date_to: iso(11), leave_type: "vacation", status: "pending" },
  ]);
  if (leaveErr) throw leaveErr;

  const staffBaseSalary = { แนน: 22000, ปั้น: 26000, ฝ้าย: 24000, บอส: 32000 };
  const { error: payrollErr } = await supabase.from("payroll_entries").insert(
    staff.map((s) => ({
      staff_id: s.id,
      period_month: monthStart,
      base_salary: staffBaseSalary[s.name],
    })),
  );
  if (payrollErr) throw payrollErr;

  const { data: quotation, error: quoteErr } = await supabase
    .from("quotations")
    .insert({
      client_id: clientId["Siam Coffee Co."],
      quote_no: "QT2569-001",
      items: [
        { description: "ถ่ายภาพสินค้า (1 วัน)", qty: 1, unitPrice: 8000 },
        { description: "ตัดต่อรีลโปรโมชั่น 3 คลิป", qty: 3, unitPrice: 2500 },
      ],
      vat_percent: 7,
      wht_percent: 3,
      status: "sent",
    })
    .select("id")
    .single();
  if (quoteErr) throw quoteErr;

  const { error: receiptErr } = await supabase.from("receipts").insert({
    client_id: clientId["Luna Skincare"],
    receipt_no: "RC2569-014",
    amount: 18500,
  });
  if (receiptErr) throw receiptErr;

  const { error: txErr } = await supabase.from("transactions").insert([
    { type: "income", category: "รับชำระค่างาน", amount: 18500, description: "Luna Skincare — แคมเปญภาพนิ่ง", occurred_at: iso(-2) },
    { type: "expense", category: "อุปกรณ์ถ่ายทำ", amount: 3200, description: "เช่าไฟสตูดิโอเพิ่ม", occurred_at: iso(-4) },
    { type: "expense", category: "เดินทาง", amount: 450, description: "ค่าน้ำมันไปถ่ายงาน Baan Suan Resort", occurred_at: iso(-1) },
  ]);
  if (txErr) throw txErr;

  console.log("Seed complete:", {
    clients: clients.length,
    staff: staff.length,
    tasks: 10,
    quotation: quotation.id,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
