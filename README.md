# พร้อมโพส (PromPost)

ระบบหลังบ้าน/จัดการสำหรับมีเดียเอเจนซี่ — Dashboard, ปฏิทินงานแบบเมทริกซ์, จัดการลูกค้า +
Client Portal, พนักงาน/เงินเดือน, และบัญชี ดู [ENVIRONMENTS.md](ENVIRONMENTS.md) สำหรับเรื่อง secrets/CI

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — ธีมสีขาว/ส้ม (`brand-*` ใน `tailwind.config.ts`)
- **Supabase** (Postgres + Auth + Storage) — `src/lib/supabase/client.ts` (browser, publishable
  key), `server.ts` (server components), `admin.ts` (server-only, secret key — ข้าม RLS)
- **lucide-react** ไอคอน, **date-fns** จัดการวันที่ (locale ไทย)

## โครงสร้างโปรเจกต์

```
src/
  app/
    (app)/              กลุ่ม route ที่มี Sidebar — dashboard, calendar, clients, hr, accounting
    portal/[token]/      พอร์ทัลลูกค้าแบบสาธารณะ ไม่ต้องล็อกอิน (คีย์ด้วย portal_token)
  components/
    layout/               Sidebar, Topbar
    ui/                    Card, StatusBadge ฯลฯ (ใช้ร่วมกันทุกหน้า)
    dashboard/             StatCard, TaskTable
    calendar/               CalendarMatrix (ลูกค้า x วันที่ + modal รายละเอียดงาน)
    tasks/                  TaskModal — เพิ่ม/แก้ไขงาน ใช้ร่วมกันทั้ง Dashboard และ Calendar
    clients/                ClientModal — เพิ่ม/แก้ไขลูกค้า
    hr/                     StaffModal, LeaveModal
    accounting/             QuotationModal (VAT/หัก ณ ที่จ่ายคำนวณสด), ReceiptModal, TransactionModal
  lib/
    types.ts               types ใช้ร่วมกันทั้งแอป (Client/Staff/Task/Leave/Payroll/Quotation/...)
    mock-data.ts            ข้อมูลตัวอย่าง — ทุกหน้ายังรันบนอันนี้จนกว่าจะต่อ Supabase จริง
    accounting.ts           คำนวณ VAT/หัก ณ ที่จ่าย + เลขที่เอกสารอัตโนมัติ
    supabase/                client.ts / server.ts / admin.ts

supabase/migrations/0001_init.sql   โครงสร้างตาราง DB สำหรับทั้ง 5 โมดูล — ยังไม่ได้รันจริง
.github/workflows/ci.yml            typecheck + build, อ่าน secrets จาก GitHub Actions
```

## เริ่มพัฒนา

โปรเจกต์นี้ไม่มี secrets จริงอยู่ในเรโปเลย แม้แต่ในไฟล์ local ที่ .gitignore ไว้ — ดู
[ENVIRONMENTS.md](ENVIRONMENTS.md) ก่อนว่าต้องสร้าง `.env.local` ของตัวเองยังไง

```bash
npm install
cp .env.local.example .env.local   # แล้วใส่ค่าจริงของคุณเอง (ไม่ถูก commit)
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) — จะ redirect ไปหน้า `/dashboard`

## สถานะปัจจุบัน

ทุกหน้า (Dashboard/Calendar/ลูกค้า/พนักงาน/บัญชี) ใช้งานได้จริงกับข้อมูลตัวอย่าง (mock data ใน
`src/lib/mock-data.ts`) — เพิ่ม/แก้ไขงาน, ลูกค้า, พนักงาน, วันหยุด, เงินเดือน, ใบเสนอราคา/ใบเสร็จ/
รายรับ-รายจ่าย ได้ครบ แต่ข้อมูลยังอยู่แค่ใน state หน้าเว็บ (รีเฟรชแล้วหาย)

**ยังไม่ได้ต่อฐานข้อมูลจริง** — `supabase/migrations/0001_init.sql` ยังไม่ได้ถูกรันบนโปรเจกต์
Supabase จริง (ต้องรันเองผ่าน Dashboard > SQL Editor สักครั้ง แล้วค่อยสลับหน้าเว็บจาก mock data
เป็น query จริง)

## ขั้นต่อไปที่แนะนำ

1. รัน `supabase/migrations/0001_init.sql` ผ่าน Supabase Dashboard > SQL Editor
2. เปลี่ยนแต่ละหน้าจาก `mock-data.ts` เป็น query จริงผ่าน `src/lib/supabase/client.ts`/`server.ts`
3. ใส่ระบบ Auth (staff ล็อกอินด้วย Supabase Auth) แทนหน้าที่ยังไม่มี guard ตอนนี้
4. ตั้งค่า GitHub repo secrets ตาม [ENVIRONMENTS.md](ENVIRONMENTS.md) แล้วเลือก hosting (Vercel ฯลฯ)
   เพิ่มขั้น deploy จริงต่อจาก `.github/workflows/ci.yml`
5. อัปโหลดสลิป/ไฟล์แนบขึ้น Supabase Storage จริง (ตอนนี้ `TransactionModal` ใช้ local preview เท่านั้น)
