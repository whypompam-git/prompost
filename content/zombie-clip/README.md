# คลิป "ซอมบี้บุกเอเจนซี่" — เวอร์ชัน motion graphic

- `zombie-agency-clip.mp4` — 1080×1920 (9:16), 84 วินาที, ซับไทยในตัว + ดนตรี/เอฟเฟกต์เสียง
- สคริปต์ต้นฉบับ: `../zombie-agency-clip.md`

## สร้างใหม่

```bash
python3 audio.py audio.wav   # ดนตรี + SFX (numpy)
node render.js               # วาดทีละเฟรมด้วย Playwright แล้วต่อเป็น mp4 ด้วย ffmpeg
```

แก้ซับ/จังหวะได้ที่ `CAPS` ใน `scene.html`, เวลาฉากที่ `SCENES`, ส่วนเสียงอยู่ใน `audio.py`
ฟอนต์ Kanit (SIL Open Font License) อยู่ใน `fonts/`
