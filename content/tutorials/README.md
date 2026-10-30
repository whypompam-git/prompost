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

## ใส่เสียงพากย์ (เสียงผู้ชาย th-TH-NiwatNeural ผ่าน Azure Speech)

ต้องมีใน environment: ตัวแปร `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (เช่น `southeastasia`) และโดเมน
`<region>.tts.speech.microsoft.com` ใน Allowed domains

ขั้นตอน (รันจาก `content/tutorials/tooling`, ทำ "อัดใหม่" ด้านบนให้แอป + demo-db พร้อมก่อน):

```bash
node collect.js staff.js > lines-staff.json
node collect.js outsource.js > lines-outsource.json
python3 tts.py lines-staff.json out-staff/voice azure th-TH-NiwatNeural
python3 tts.py lines-outsource.json out-outsource/voice azure th-TH-NiwatNeural
demo-db/reset.sh && node staff.js
demo-db/reset.sh && node outsource.js
```

`tut.js` เจอ `out-*/voice/manifest.json` แล้วจะเล่นเสียงตามซับแต่ละบรรทัด ยืดเวลาแต่ละขั้นให้พอดีเสียง
ลดเพลงลง และเขียนไฟล์ `.srt` คู่กับ `.mp4`

### ทางเลือก: Google Cloud Text-to-Speech

ต้องมีตัวแปร `GOOGLE_TTS_API_KEY` และโดเมน `texttospeech.googleapis.com` ใน Allowed domains
เสียงผู้ชายภาษาไทยอยู่ในกลุ่ม Chirp 3 HD — ดูรายชื่อเสียงไทยที่ใช้ได้จริงก่อน แล้วเลือกตัวที่ `ssmlGender` เป็น `MALE`:

```bash
python3 -c "import os,json,ssl,urllib.request as u; c=ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt'); r=json.load(u.urlopen('https://texttospeech.googleapis.com/v1/voices?languageCode=th-TH&key='+os.environ['GOOGLE_TTS_API_KEY'],context=c)); [print(v['name'],v['ssmlGender']) for v in r['voices']]"
python3 tts.py lines-staff.json out-staff/voice google <ชื่อเสียงผู้ชาย>
python3 tts.py lines-outsource.json out-outsource/voice google <ชื่อเสียงผู้ชาย>
```
