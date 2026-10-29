# คลิปสอนใช้งานพร้อมโพส

| ไฟล์ | สำหรับ | ความยาว |
|---|---|---|
| `prompost-staff-tutorial.mp4` | ทีมงานใน (โปรดิวเซอร์ · ช่างภาพ · ตัดต่อ) — 8 บท | ~5:50 |
| `prompost-outsource-tutorial.mp4` | Editor Outsource (หน้า "งานของฉัน") — 6 บท | ~3:00 |

ทั้งสองคลิปอัดจาก **แอปจริง** (build จากโค้ดใน repo นี้) บนฐานข้อมูลตัวอย่าง — ชื่อพนักงาน/ลูกค้าเป็นข้อมูลสมมติทั้งหมด
1920×1080, ซับไทยในภาพ + เพลงประกอบเบาๆ (ไม่มีเสียงพากย์)

## อัดใหม่ (เมื่อหน้าจอเปลี่ยน)

`tooling/` คือชุดที่ใช้อัด:
- `demo-db/` — Postgres ในเครื่อง + `postgrest-shim.js` (เซิร์ฟเวอร์จำลอง Supabase REST เท่าที่แอปใช้) + seed ข้อมูลตัวอย่าง, `reset.sh` ล้างแล้วสร้างใหม่จาก `supabase/migrations`
- `tut.js` — ตัวช่วยอัด: คุมแอปด้วย Playwright, วาดเคอร์เซอร์/กรอบไฮไลต์/ซับ/การ์ดบท, จับภาพที่ 1.5x แล้วต่อเป็น mp4
- `staff.js`, `outsource.js` — สคริปต์ของแต่ละคลิป (แก้ข้อความซับได้ที่ `t.cap(...)`)

ลำดับ: เปิด Postgres → `node demo-db/postgrest-shim.js` → `next build && next start` โดยตั้ง `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
→ `demo-db/reset.sh` → `node staff.js` (หรือ `outsource.js`)
