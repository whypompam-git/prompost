const { Tut } = require("./tut.js");
const path = require("path");

(async () => {
  const t = new Tut("prompost-outsource-tutorial", path.join(__dirname, "out-outsource"), { vw: 1280 });
  await t.start();
  const p = () => t.page;
  await t.goto("/login", 2500);
  await t.rec();

  await t.title(`<img src="/icon-512.png"><div class="main">คู่มือ Editor Outsource</div><div class="sub">รับงาน · ดูบรีฟ · ส่งงานตัดต่อ ผ่านระบบพร้อมโพส</div>
    <ul><li><span>1</span>เข้าสู่ระบบ</li><li><span>2</span>หน้า "งานของฉัน"</li><li><span>3</span>เปิดงาน ดูฟุตเทจ/สคริปต์</li><li><span>4</span>ส่งงาน</li><li><span>5</span>งานที่ถูกสั่งแก้</li><li><span>6</span>ปฏิทิน & แจ้งเตือน</li></ul>`, 6500, { say: "สวัสดีครับ คลิปนี้สำหรับ Editor Outsource สอนวิธีรับงาน ดูบรีฟ และส่งงานตัดต่อผ่านระบบพร้อมโพส มีทั้งหมด 6 บทครับ" });

  // 1 — login
  await t.chapter(1, "เข้าสู่ระบบ", "ใช้ชื่อของคุณ + PIN 4 หลัก");
  await t.cap("เปิดลิงก์ระบบที่ทีมส่งให้ แล้วกดเลือก <b>ชื่อของคุณ</b>", "1");
  await t.click(p().getByText("ฟ้า", { exact: true }), { after: 1200 });
  await t.cap("ใส่ <b>PIN 4 หลัก</b> ที่ได้รับจากทีมงาน (ห้ามบอกต่อ)", "1", { read: 2800 });
  for (const d of ["1", "2", "3", "4"]) await t.click(p().getByRole("button", { name: d, exact: true }), { ms: 420, after: 250 });
  await p().waitForURL((u) => !u.pathname.startsWith("/login"));
  await t.wait(2500);
  await t.cap("เข้ามาแล้วจะเจอหน้า <b>งานของฉัน</b> — แสดงเฉพาะคลิปที่มอบหมายให้คุณตัด", "1");

  // 2 — my work overview
  await t.chapter(2, "หน้า \"งานของฉัน\"", "งานแบ่งเป็น 4 กลุ่มตามสถานะ");
  await t.click(p().getByRole("button", { name: /^ทั้งหมด/ }), { after: 1200 });
  const chip = (re) => p().getByRole("button", { name: re }).first();
  await t.hl(chip(/^ต้องแก้/));
  await t.cap("<b>ต้องแก้</b> = งานที่ถูกส่งกลับมาพร้อมบรีฟแก้ — ทำกลุ่มนี้ก่อนเสมอ", "2");
  await t.hl(chip(/^ต้องทำ/));
  await t.cap("<b>ต้องทำ</b> = งานใหม่ที่ต้องตัด เรียงตามวันที่ต้องส่ง", "2");
  await t.hl(chip(/^ส่งตรวจแล้ว/));
  await t.cap("<b>ส่งตรวจแล้ว</b> = ส่งงานแล้ว รอทีม QC หรือลูกค้าตรวจ", "2");
  await t.hl(chip(/^เสร็จแล้ว/));
  await t.cap("<b>เสร็จแล้ว</b> = ลูกค้าอนุมัติแล้ว หรือโพสแล้ว 🎉", "2");
  await t.hl(null);

  // 3 — read a card
  await t.chapter(3, "เปิดงาน ดูฟุตเทจ / สคริปต์", "ทุกอย่างที่ต้องใช้ตัด อยู่ในการ์ดงาน");
  await t.click(chip(/^ต้องทำ/), { after: 1200 });
  const card = p().locator("div.rounded-2xl.border.bg-white", { hasText: "เมนูใหม่ ลาเต้ส้มยูซุ" }).first();
  await t.hl(card, 0, 10);
  await t.cap("การ์ด 1 ใบ = 1 คลิป: บอก <b>ชื่อลูกค้า</b> และ <b>ชื่องาน</b>", "3");
  await t.hl(card.getByText(/ส่งงานภายใน/));
  await t.cap("<b>ส่งงานภายใน</b> = วันที่ต้องตัดเสร็จและส่ง · สีส้ม = วันนี้ · สีแดง = เลยกำหนดแล้ว", "3", { read: 5200 });
  await t.hl(null);
  await t.move(card.getByRole("link", { name: /ฟุตเทจ/ }));
  await t.cap("ปุ่ม <b>ฟุตเทจ</b> = เปิดโฟลเดอร์ไฟล์ดิบใน Drive · ปุ่ม <b>Ref</b> = คลิปตัวอย่างที่อยากให้ออกมาประมาณนี้", "3", { read: 5200 });
  await t.click(card.getByRole("button", { name: /รายละเอียด/ }), { after: 1000 });
  await t.hl(card, 0, 10);
  await t.cap("กด <b>รายละเอียด / สคริปต์</b> เพื่อดูสคริปต์ Shot list และโน้ตจากทีม — อ่านให้ครบก่อนเริ่มตัด", "3", { read: 5000 });
  await t.hl(null);

  // 4 — submit
  await t.chapter(4, "ส่งงาน", "วางลิงก์ไฟล์ที่ตัดเสร็จ แล้วกดส่ง");
  const input = card.getByPlaceholder("วางลิงก์ Drive ของงานที่ตัดเสร็จ");
  await t.cap("ตัดเสร็จแล้ว อัปไฟล์ขึ้น Drive แล้ว <b>วางลิงก์</b> ในช่องนี้", "4", { read: 2400, pos: "top" });
  await t.type(input, "https://drive.google.com/file/d/latte-yuzu-final-v1"); await p().keyboard.press("Tab"); await t.wait(1500);
  await t.cap("⚠️ อย่าลืมตั้งสิทธิ์ลิงก์ Drive เป็น <b>\"ทุกคนที่มีลิงก์ดูได้\"</b> ไม่งั้นทีมเปิดไม่ได้", "4", { read: 4400, pos: "top" });
  await t.move(card.getByRole("button", { name: /ส่งงาน/ }));
  await t.cap("กด <b>ส่งงาน</b> → ระบบจะถามยืนยัน (ส่งแล้วถอนกลับเองไม่ได้ ตรวจให้ดีก่อน)", "4", { read: 4200, pos: "top" });
  await t.click(card.getByRole("button", { name: /ส่งงาน/ }), { ms: 300, after: 2200 });
  await t.cap("ส่งเรียบร้อย ✅ งานย้ายไป <b>ส่งตรวจแล้ว</b> และระบบแจ้งเตือนผู้รับผิดชอบให้ตรวจงานทันที", "4", { read: 4600 });
  await t.click(chip(/^ส่งตรวจแล้ว/), { after: 2000 });

  // 5 — revisions
  await t.chapter(5, "งานที่ถูกสั่งแก้", "อ่านบรีฟ แก้ แล้วส่งใหม่ในการ์ดเดิม");
  await t.click(chip(/^ต้องแก้/), { after: 1400 });
  const rcard = p().locator("div.rounded-2xl.border.bg-white", { hasText: "บาริสต้าเล่าเบื้องหลัง" }).first();
  await t.hl(rcard.getByText(/แก้รอบที่/));
  await t.cap("งานที่ถูกส่งกลับจะขึ้นป้าย <b>แก้รอบที่ …</b> ให้เห็นชัดๆ", "5");
  await t.hl(rcard.locator("div.bg-rose-50").first());
  await t.cap("กล่อง <b>บรีฟแก้</b> บอกว่าต้องแก้อะไร (มักระบุเวลาในคลิป เช่น 0:12)", "5", { read: 4200 });
  await t.hl(null);
  await t.type(rcard.getByPlaceholder("วางลิงก์ Drive ของงานที่ตัดเสร็จ"), "https://drive.google.com/file/d/barista-v2"); await p().keyboard.press("Tab"); await t.wait(1500);
  await t.cap("แก้เสร็จ → วางลิงก์ไฟล์ <b>เวอร์ชันใหม่</b> → กดส่งงานเหมือนเดิม", "5", { read: 3200, pos: "top" });
  await t.click(rcard.getByRole("button", { name: /ส่งงาน/ }), { after: 2200 });

  // 6 — calendar + bell
  await t.chapter(6, "ปฏิทิน & แจ้งเตือน", "วางแผนว่าวันไหนต้องตัดอะไร");
  await t.click(p().getByRole("button", { name: /ปฏิทิน/ }), { after: 1500 });
  await t.cap("แท็บ <b>ปฏิทิน</b> แสดงจำนวนงานที่ต้องตัด/ส่งในแต่ละวัน", "6");
  const day = p().locator("button", { hasText: /^30/ }).filter({ hasText: "งาน" }).first();
  await t.click(day, { after: 1500 });
  await t.cap("กดที่วันเพื่อดูรายการงานของวันนั้นด้านล่าง", "6");
  await t.click(p().getByLabel("การแจ้งเตือน"), { after: 1500 });
  await t.cap("<b>กระดิ่ง</b> แจ้งเตือนเมื่อได้รับงานใหม่ หรือมีงานถูกสั่งแก้ — เช็กทุกวัน", "6", { pos: "top", read: 4400 });
  await p().keyboard.press("Escape");
  await t.click(p().getByLabel("การแจ้งเตือน"), { after: 800 }).catch(() => {});
  await t.move(p().getByLabel("ออกจากระบบ"));
  await t.cap("ใช้เครื่องคนอื่น? กด <b>ออกจากระบบ</b> ทุกครั้งหลังใช้งาน", "6");
  await t.nocap();

  await t.title(`<img src="/icon-512.png"><div class="main">เช็กลิสต์ก่อนกดส่งงาน</div>
    <ul><li><span>✓</span>แก้ครบทุกข้อในบรีฟ</li><li><span>✓</span>ลิงก์ Drive เปิดให้ดูได้</li><li><span>✓</span>ส่งภายในวันที่กำหนด</li><li><span>✓</span>สงสัย ทักผู้รับผิดชอบงาน</li></ul>`, 6500, { say: "ก่อนกดส่งงานทุกครั้ง เช็กให้ครบนะครับ. แก้ครบทุกข้อในบรีฟ, ลิงก์ไดรฟ์เปิดให้ดูได้, ส่งภายในวันที่กำหนด. และถ้าสงสัยอะไร ทักผู้รับผิดชอบงานได้เลย ขอบคุณครับ" });
  await t.finish();
})().catch((e) => { console.error(e); process.exit(1); });
