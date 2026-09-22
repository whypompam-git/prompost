# พร้อมโพส (PromPost)

ระบบหลังบ้าน/จัดการสำหรับมีเดียเอเจนซี่ — Dashboard, ปฏิทินงานแบบเมทริกซ์, จัดการลูกค้า +
Client Portal, พนักงาน/เงินเดือน, และบัญชี

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — ธีมสีขาว/ส้ม (`brand-*` ใน `tailwind.config.ts`)
- **Supabase** (Postgres + Auth + Storage) — client ตั้งไว้แล้วที่ `src/lib/supabase/`
- **lucide-react** ไอคอน, **date-fns** จัดการวันที่ (locale ไทย), **recharts**-ready structure

## โครงสร้างโปรเจกต์

```
src/
  app/
    (app)/              กลุ่ม route ที่มี Sidebar — dashboard, calendar, clients, hr, accounting
    portal/[token]/      พอร์ทัลลูกค้าแบบสาธารณะ ไม่ต้องล็อกอิน (คีย์ด้วย portal_token)
  components/
    layout/               Sidebar, Topbar
    ui/                    Card, StatusBadge ฯลฯ (ใช้ร่วมกันทุกหน้า)
    dashboard/             StatCard, TaskTable (สถานะ/ผู้รับผิดชอบแก้ไขได้ทันที)
    calendar/               CalendarMatrix (ลูกค้า x วันที่ + modal รายละเอียดงาน)
  lib/
    types.ts               Client / Staff / Task — ใช้ร่วมกันทั้งแอป
    mock-data.ts            ข้อมูลตัวอย่างสำหรับ Dashboard/Calendar ก่อนต่อ Supabase จริง
    supabase/                client.ts (browser) / server.ts (server components)
  config/
    branding.ts             ชื่อแอป/ธีม จุดเดียว

supabase/migrations/0001_init.sql   โครงสร้างตาราง DB ร่างสำหรับทั้ง 5 โมดูล
```

## เริ่มพัฒนา

```bash
npm install
cp .env.local.example .env.local   # แล้วใส่ Supabase URL/anon key ของคุณ
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) — จะ redirect ไปหน้า `/dashboard`

## สถานะปัจจุบัน

หน้า **Dashboard** และ **Calendar** ใช้งานได้จริงกับข้อมูลตัวอย่าง (mock data) —
เปลี่ยนสถานะงาน/ผู้รับผิดชอบในตาราง Dashboard ได้ทันที, ปฏิทินคลิกดูรายละเอียดงานได้
หน้า **ลูกค้า**, **พนักงาน**, **บัญชี** เป็นโครงเริ่มต้น (placeholder) ที่แสดงข้อมูลตัวอย่างแล้ว
รอเชื่อม Supabase จริงและฟอร์ม CRUD ในขั้นต่อไป

## ขั้นต่อไปที่แนะนำ

1. สร้างโปรเจกต์ Supabase จริง แล้วรัน `supabase/migrations/0001_init.sql`
2. ใส่ระบบ Auth (staff ล็อกอินด้วย Supabase Auth) แทนหน้าที่ยังไม่มี guard ตอนนี้
3. เปลี่ยน `mock-data.ts` เป็น query จริงผ่าน `src/lib/supabase/server.ts`
4. ต่อฟอร์มเพิ่ม/แก้ไขลูกค้า, พนักงาน, งาน (ตอนนี้แก้ได้แค่สถานะ/ผู้รับผิดชอบใน Dashboard)
5. ทำหน้าใบเสนอราคา/ใบเสร็จ (คำนวณ VAT/หัก ณ ที่จ่าย) ต่อจากโครง `accounting/page.tsx`
