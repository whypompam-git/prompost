const { Tut } = require("./tut.js");
const path = require("path");

const taskId = async (title) => {
  const r = await fetch(`http://127.0.0.1:54321/rest/v1/tasks?select=id&title=eq.${encodeURIComponent(title)}`);
  return (await r.json())[0].id;
};
const C1 = "00000000-0000-0000-0000-0000000000c1";

(async () => {
  const t = new Tut("prompost-staff-tutorial", path.join(__dirname, "out-staff"), { vw: 1600 });
  await t.start();
  const p = () => t.page;
  await t.goto("/login", 2500);
  await t.rec();

  await t.title(`<img src="/icon-512.png"><div class="main">สอนใช้งานพร้อมโพส</div><div class="sub">สำหรับทีมงาน — โปรดิวเซอร์ · ช่างภาพ · ตัดต่อ</div>
    <ul><li><span>1</span>เข้าสู่ระบบ</li><li><span>2</span>แดชบอร์ด</li><li><span>3</span>ขั้นตอนของคลิป</li><li><span>4</span>เพิ่มงานใหม่</li>
    <li><span>5</span>รายละเอียดงาน</li><li><span>6</span>ส่งต่องาน ถ่าย → ตัด → QC</li><li><span>7</span>หน้าลูกค้า & ลิงก์ลูกค้า</li><li><span>8</span>ปฏิทิน · สรุปงาน · แจ้งเตือน</li></ul>`, 7500, { say: "สวัสดีค่ะ คลิปนี้จะสอนทีมงานใช้ระบบพร้อมโพส ตั้งแต่เข้าสู่ระบบ ไปจนถึงส่งงานให้ลูกค้า มีทั้งหมด 8 บทค่ะ" });

  // 1 — login
  await t.chapter(1, "เข้าสู่ระบบ", "เลือกชื่อตัวเอง แล้วใส่ PIN 4 หลัก");
  await t.cap("เปิดเว็บพร้อมโพส แล้วกดเลือก <b>ชื่อของตัวเอง</b>", "1");
  await t.click(p().getByText("เมย์", { exact: true }), { after: 1100 });
  await t.cap("ใส่ <b>PIN 4 หลัก</b> (ได้จากเจ้าของระบบ · ลืม PIN ให้แจ้งเจ้าของรีเซ็ตให้)", "1", { read: 3600 });
  for (const d of ["1", "2", "3", "4"]) await t.click(p().getByRole("button", { name: d, exact: true }), { ms: 420, after: 250 });
  await p().waitForURL(/dashboard/);
  await t.wait(2600);

  // 2 — dashboard
  await t.chapter(2, "แดชบอร์ด", "หน้าแรกหลังเข้าระบบ — เห็นทุกคลิปของทีม");
  await t.hl(p().locator("table").first(), 0, 6);
  await t.cap("ตารางนี้รวม <b>ทุกคลิปของทีม</b> — 1 แถว = 1 คลิป เรียงตามวันส่ง", "2");
  await t.hl(null);
  await t.hl(p().locator("thead").first());
  await t.cap("แต่ละคลิปมี <b>วันถ่าย · วันตัดต่อ · วันส่ง</b>, ขั้นตอน (ประเภท), สถานะ, <b>ผู้รับผิดชอบ</b> และ <b>Editor</b>", "2", { read: 5200 });
  await t.hl(null);
  await t.click(p().getByRole("button", { name: "งานของฉัน", exact: true }), { after: 1500 });
  await t.cap("กด <b>งานของฉัน</b> = ดูเฉพาะงานที่เรารับผิดชอบ ตัดต่อ หรือดูแลลูกค้าอยู่", "2", { read: 4200 });
  await t.click(p().getByRole("button", { name: "งานทีม", exact: true }), { after: 1000 });
  await t.hl(p().getByRole("button", { name: /^ทั้งหมด \d/ }).locator("xpath=.."), 0, 8);
  await t.cap("แถบนี้คือ <b>ขั้นตอนของคลิป</b> พร้อมจำนวน — กดเพื่อกรองดูเฉพาะขั้นนั้น", "2");
  await t.hl(null);
  await t.click(p().getByRole("button", { name: /^ตัดต่อ \d/ }), { after: 1600 });
  await t.cap("เช่น กด <b>ตัดต่อ</b> → เหลือเฉพาะคลิปที่อยู่ระหว่างตัด", "2");
  await t.click(p().getByRole("button", { name: /^ทั้งหมด \d/ }), { after: 1200 });
  const row = p().locator("tr", { hasText: "เมนูใหม่ ลาเต้ส้มยูซุ" }).first();
  await t.hl(row.getByRole("button", { name: /Ref/ }).locator("xpath=.."), 0, 6);
  await t.cap("ปุ่มลิงก์: <b>Ref</b> = คลิปตัวอย่าง · <b>File</b> = ฟุตเทจดิบ · <b>Final</b> = ไฟล์ที่ตัดเสร็จ (สีส้ม = มีลิงก์แล้ว กดเปิดได้)", "2", { read: 5600 });
  await t.hl(null);

  // 3 — pipeline
  await t.chapter(3, "ขั้นตอนของคลิป", "ทุกคลิปเดินตาม 7 ขั้นนี้ ระบบส่งต่อให้อัตโนมัติ");
  const pill = (c, l) => `<span class="pill" style="background:${c}">${l}</span>`;
  await t.card(`<h2>คลิป 1 ชิ้น เดินทางแบบนี้</h2>
    <div class="row">${pill("#8b5cf6", "Plan")} ไอเดีย/สคริปต์ → รอลูกค้าเลือก <b>ใช้ / แก้ / ไม่ใช้</b></div>
    <div class="row">${pill("#0ea5e9", "ถ่ายทำ")} ช่างภาพถ่าย → ถ่ายเสร็จ <b>ใส่ลิงก์ฟุตเทจ</b> <span class="arrow">→ ไปตัดต่อเอง</span></div>
    <div class="row">${pill("#f97316", "ตัดต่อ")} Editor ตัด → ตัดเสร็จ <span class="arrow">→ เข้า QC เอง</span></div>
    <div class="row">${pill("#f59e0b", "QC")} ผู้รับผิดชอบตรวจ → <b>Done</b> <span class="arrow">→ ส่งลูกค้าเอง</span> หรือ <b>สั่งแก้</b></div>
    <div class="row">${pill("#f43f5e", "Pending")} ลูกค้าตรวจผ่านลิงก์ → กด <b>ผ่าน</b> หรือ <b>แก้ไข</b></div>
    <div class="row">${pill("#10b981", "ผ่าน")} อนุมัติแล้ว รอโพส</div>
    <div class="row">${pill("#14b8a6", "Post")} โพสแล้ว 🎉</div>`, 13000, { say: "คลิปหนึ่งชิ้นจะเดินทางแบบนี้ค่ะ เริ่มจาก Plan ให้ลูกค้าเลือก, ถ่ายทำ, ตัดต่อ, QC ตรวจงาน, Pending รอลูกค้าอนุมัติ, ผ่าน แล้วก็โพส. ทุกครั้งที่ถ่ายเสร็จ ตัดเสร็จ หรือตรวจผ่าน ระบบจะส่งต่อไปขั้นถัดไปให้เองอัตโนมัติ" });
  await t.cap("ทุกครั้งที่งานเปลี่ยนมือ ระบบจะ <b>แจ้งเตือนคนถัดไป</b> ให้เอง — หน้าที่เราคืออัปเดตทันทีที่ทำเสร็จ", "3", { read: 5000 });

  // 4 — new task
  await t.chapter(4, "เพิ่มงานใหม่", "สร้างคลิปใหม่ให้ลูกค้า");
  await t.click(p().getByRole("button", { name: /เพิ่มงานใหม่/ }), { after: 1100 });
  const modal = p().locator("div.max-w-md").first();
  await t.cap("กด <b>+ เพิ่มงานใหม่</b> แล้วตั้งชื่องานให้รู้ทันทีว่าคลิปอะไร", "4", { read: 2400 });
  await t.type(modal.getByPlaceholder("เช่น ถ่ายภาพสินค้าใหม่ประจำเดือน"), "ไอเดีย: เมนูหน้าหนาว Hot Cocoa");
  await t.cap("เลือก <b>ลูกค้า</b> และ <b>ประเภทงาน</b> — งานใหม่ที่ยังเป็นไอเดีย ให้เริ่มที่ <b>Plan</b>", "4", { read: 3600 });
  await t.select(modal.locator("select").nth(0), C1);
  await t.select(modal.locator("select").nth(1), "plan");
  await t.cap("เลือก <b>ผู้รับผิดชอบ</b> และวันถ่าย / กำหนดส่ง", "4", { read: 2400 });
  await t.select(modal.locator("select").nth(3), "00000000-0000-0000-0000-000000000002");
  await t.move(modal.locator('input[type="date"]').nth(0)); await modal.locator('input[type="date"]').nth(0).fill("2026-11-06"); await t.wait(500);
  await t.move(modal.locator('input[type="date"]').nth(1)); await modal.locator('input[type="date"]').nth(1).fill("2026-11-12"); await t.wait(700);
  await t.click(modal.getByRole("button", { name: "สร้างงาน" }), { after: 1800 });
  await t.cap("สร้างแล้ว ✅ ลูกค้าจะเห็นไอเดียนี้ในลิงก์ของเขา และกดเลือก <b>ใช้ / แก้ / ไม่ใช้</b> ได้เลย", "4", { read: 4600 });
  await t.hl(p().getByRole("button", { name: /เพิ่มหลายงาน/ }));
  await t.cap("มีหลายคลิปพร้อมกัน? ใช้ <b>เพิ่มหลายงาน</b> สร้างทีเดียวทั้งชุด", "4");
  await t.hl(null);

  // 5 — task detail
  await t.chapter(5, "รายละเอียดงาน", "สคริปต์ · Shot list · คนถ่าย · Editor · วันตัดต่อ");
  await t.goto(`/tasks/${await taskId("เมนูหน้าหนาว")}`, 2200);
  await t.cap("กดชื่องานเพื่อเปิด <b>หน้ารายละเอียด</b> — ด้านบนบอกว่าตอนนี้อยู่ขั้นไหน", "5");
  await t.hl(p().locator("label", { hasText: "Shot" }).locator("xpath=.."), 0, 8);
  await t.cap("ใส่ <b>Shot list</b> และ <b>ของที่ต้องเตรียม</b> — พิมพ์แล้วกด Enter ทีละข้อ", "5");
  await t.hl(null);
  const shot = p().getByPlaceholder("พิมพ์ชื่อชอตแล้ว Enter");
  await t.type(shot, "ช็อตไอน้ำลอยจากแก้ว"); await p().keyboard.press("Enter"); await t.wait(600);
  await shot.pressSequentially("มือประคองแก้วอุ่นๆ", { delay: 80 }); await p().keyboard.press("Enter"); await t.wait(800);
  await t.click(p().getByRole("button", { name: /^บันทึก$/ }), { after: 1600 });
  await t.click(p().getByRole("link", { name: /แก้ไขรายละเอียด/ }), { after: 2200 });
  await t.cap("ปุ่ม <b>แก้ไขรายละเอียด</b> ใช้มอบหมายคน: <b>ผู้รับผิดชอบ</b> (ถ่าย/QC/อนุมัติ) และ <b>Editor</b> (คนตัด)", "5", { read: 5000 });
  const field = (txt) => p().locator("label", { hasText: txt }).first().locator("xpath=following-sibling::*[1]");
  await t.select(field("Editor (คนตัดต่อ"), "00000000-0000-0000-0000-000000000004");
  await t.hl(field("วันตัดต่อ"));
  await t.cap("<b>วันตัดต่อ</b> = วันที่ Editor ต้องตัดและส่ง (Outsource จะเห็นแค่วันนี้ ไม่เห็นวันส่งลูกค้า)", "5", { read: 5200 });
  await field("วันตัดต่อ").fill("2026-11-04"); await t.wait(600);
  await t.hl(null);
  await t.click(p().getByRole("button", { name: /^บันทึก$/ }), { after: 1800 });

  // 6 — hand-offs
  await t.chapter(6, "ส่งต่องาน ถ่าย → ตัด → QC", "อัปเดตทันทีที่ทำเสร็จ ระบบส่งต่อให้เอง");
  await t.goto("/dashboard", 2200);
  const shootRow = p().locator("tr", { hasText: "จัดฟันใสเจ็บไหม?" }).first();
  await t.hl(shootRow, 0, 4);
  await t.cap("<b>ช่างภาพ:</b> คลิปนี้ถ่ายเสร็จแล้ว แต่ยัง <b>รออัปโหลดไฟล์</b>", "6");
  await t.hl(null);
  await t.click(shootRow.getByRole("button", { name: /File/ }), { after: 1000 });
  await t.cap("กด <b>+ File</b> แล้ววางลิงก์โฟลเดอร์ฟุตเทจใน Drive", "6", { read: 2200 });
  await p().getByPlaceholder(/วางลิงก์ที่นี่/).pressSequentially("https://drive.google.com/drive/folders/yimsuay-q1-clip1", { delay: 45 });
  await t.wait(500);
  await t.click(p().getByRole("button", { name: "ยืนยัน", exact: true }), { after: 2200 });
  await t.hl(p().locator("tr", { hasText: "จัดฟันใสเจ็บไหม?" }).first(), 0, 4);
  await t.cap("ใส่ลิงก์ปุ๊บ งานย้ายไป <b>ตัดต่อ</b> อัตโนมัติ และแจ้ง Editor ทันที ✅", "6", { read: 4200 });
  await t.hl(null);

  await t.goto(`/tasks/${await taskId("5 เมนูขายดี")}`, 2200);
  await t.cap("<b>ผู้รับผิดชอบ (QC):</b> Editor ส่งงานมาแล้ว คลิปอยู่ขั้น <b>QC · In Review</b> — เปิด Final ดูให้ละเอียด", "6", { read: 5000 });
  const brief = p().getByPlaceholder(/0:12 เสียงเบา/);
  await t.hl(brief.locator("xpath=.."), 0, 8);
  await t.cap("เจอจุดต้องแก้? พิมพ์บรีฟให้ชัด <b>(เวลา + ต้องแก้อะไร)</b> แล้วกด <b>สั่งแก้</b> → งานกลับไปหา Editor", "6", { read: 5000 });
  await t.hl(null);
  await t.type(brief, "0:05 ซับตกขอบ / ตัดช่วงเงียบตอนท้าย 2 วิ");
  await t.cap("(ตัวอย่างนี้เราจะไม่ส่ง) — ถ้างานผ่าน ให้ไปเปลี่ยนสถานะเป็น <b>Done</b> แทน", "6", { read: 3800 });

  await t.goto(`/clients/${C1}`, 2400);
  const qcRow = p().locator("tr", { hasText: "5 เมนูขายดี" }).first();
  await t.hl(qcRow, 0, 4);
  await t.cap("ในหน้าลูกค้า เปลี่ยนสถานะได้ตรงแถวเลย: QC ผ่าน → เลือก <b>Done</b>", "6");
  await t.hl(null);
  await t.select(qcRow.locator("select").nth(1), "done", { after: 2000 });
  await t.hl(p().locator("tr", { hasText: "5 เมนูขายดี" }).first(), 0, 4);
  await t.cap("ระบบย้ายไป <b>Pending · รอลูกค้าอนุมัติ</b> ให้อัตโนมัติ — ลูกค้าเห็นในลิงก์ทันที", "6", { read: 4400 });
  await t.hl(null);

  // 7 — client page + link
  await t.chapter(7, "หน้าลูกค้า & ลิงก์ลูกค้า", "ดูงานทั้งหมดของลูกค้า แยกตามคิวถ่าย");
  await t.goto(`/clients/${C1}`, 2000);
  await t.hl(p().getByRole("button", { name: /^ทั้งหมด \d/ }).locator("xpath=.."), 0, 8);
  await t.cap("ด้านบนสรุปว่าลูกค้ารายนี้มีคลิปอยู่ขั้นไหนกี่ชิ้น", "7");
  await t.hl(null);
  await t.hl(p().getByText(/^คิว1 - บ้านสวน/).first().locator("xpath=ancestor::div[contains(@class,'rounded')][1]"), 0, 6);
  await t.cap("คลิปถูกจัดเป็น <b>คิว</b> = รอบที่ออกกองถ่ายด้วยกัน มีวันถ่าย ทีม และลำดับการถ่าย", "7", { read: 4400 });
  await t.hl(null);
  await t.hl(p().getByRole("button", { name: /ถ่ายแล้วทั้งคิว/ }).first());
  await t.cap("ถ่ายครบทั้งคิวแล้ว กด <b>ถ่ายแล้วทั้งคิว</b> ทีเดียวจบ", "7");
  await t.hl(null);
  await t.click(p().getByRole("link", { name: "แบรนด์บรีฟ" }), { after: 1800 });
  await t.cap("แท็บ <b>แบรนด์บรีฟ</b> = โทน สี ฟอนต์ สิ่งที่ลูกค้าชอบ/ไม่ชอบ — <b>อ่านก่อนถ่ายและก่อนตัดทุกครั้ง</b>", "7", { read: 4600 });
  await t.goto("/clients", 2200);
  const copy = p().getByRole("button", { name: "คัดลอกลิงก์" }).last();
  await copy.scrollIntoViewIfNeeded();
  await t.click(copy, { after: 1200 });
  await t.cap("หน้ารายชื่อลูกค้า กด <b>คัดลอกลิงก์</b> เพื่อส่งลิงก์ให้ลูกค้าทางไลน์ (ไม่ต้องล็อกอิน)", "7", { read: 4200 });
  await t.goto("/baansuan", 2600);
  await t.cap("นี่คือหน้าที่ <b>ลูกค้าเห็น</b> — สรุปจำนวนคลิปในแต่ละขั้น", "7");
  await t.hl(p().getByText("แผนคลิปนี้ ใช้เลยไหม?").first().locator("xpath=.."), 0, 8);
  await t.cap("ไอเดียขั้น Plan ลูกค้ากด <b>ใช้ / แก้ / ไม่ใช้</b> ได้เอง · คลิปขั้น Pending กด <b>ผ่าน / แก้ไข</b>", "7", { read: 5000 });
  await t.hl(null);
  await t.cap("ลูกค้ากดแล้ว ขั้นงานในระบบเปลี่ยนให้เอง และแจ้งเตือนทีมทันที — ไม่ต้องตามถามในไลน์", "7", { read: 4600 });

  // 8 — calendar, workload, bell, note
  await t.chapter(8, "ปฏิทิน · สรุปงาน · แจ้งเตือน", "วางแผนงานและไม่พลาดอะไร");
  await t.goto("/calendar", 2200);
  await t.cap("<b>ปฏิทินงาน</b> = วันถ่าย (ตามคิว) · วันตัดต่อ/QC · วันส่งลูกค้า ดูได้ทั้ง วัน / สัปดาห์ / เดือน", "8", { read: 5000 });
  await t.goto("/workload", 2200);
  await t.cap("<b>สรุปงาน</b> = ใครมีงานอะไรใน 7 วันข้างหน้า — ช่องแดงคือ <b>เลยกำหนด</b> ต้องรีบเคลียร์", "8", { read: 5000 });
  await t.click(p().getByLabel("การแจ้งเตือน"), { after: 1500 });
  await t.cap("<b>กระดิ่ง</b> = งานที่ส่งมาถึงเรา ลูกค้าอนุมัติ/ขอแก้ หรืองานเลยกำหนด — เช็กทุกเช้า", "8", { pos: "top", read: 4800 });
  await p().keyboard.press("Escape"); await t.wait(300);
  await t.click(p().getByLabel("การแจ้งเตือน"), { after: 600 }).catch(() => {});
  await t.goto("/workload", 1500);
  await t.click(p().getByLabel("จดการคุยกับลูกค้า"), { after: 1200 });
  await t.cap("ปุ่ม <b>Note</b> = จดว่าคุยอะไรกับลูกค้า เก็บเป็นประวัติให้ทั้งทีมเห็น", "8", { pos: "top", read: 4200 });
  await t.click(p().getByRole("button", { name: "ร้านกาแฟบ้านสวน" }).first(), { after: 600 });
  await t.type(p().getByPlaceholder(/คุยอะไรกับลูกค้า/), "ลูกค้าอยากเลื่อนถ่ายคิว2 เป็นบ่ายวันจันทร์");
  await t.wait(1200);
  await t.nocap();

  await t.title(`<img src="/icon-512.png"><div class="main">กฎทอง 3 ข้อ</div>
    <ul style="grid-template-columns:minmax(0,1100px)"><li><span>1</span>ทำเสร็จ = อัปเดตขั้นงานทันที (ระบบส่งต่อให้เอง)</li><li><span>2</span>ใส่ลิงก์ File / Final ทุกครั้ง ตั้งสิทธิ์ให้ดูได้</li><li><span>3</span>บรีฟแก้ต้องมี เวลา + สิ่งที่ต้องแก้</li></ul>`, 7000, { say: "สุดท้าย กฎทอง 3 ข้อค่ะ. หนึ่ง ทำเสร็จแล้วอัปเดตขั้นงานทันที. สอง ใส่ลิงก์ไฟล์และไฟนอลทุกครั้ง และเปิดสิทธิ์ให้ดูได้. สาม บรีฟแก้ต้องบอกเวลา และสิ่งที่ต้องแก้ให้ชัด. ขอบคุณค่ะ" });
  await t.finish();
})().catch((e) => { console.error(e); process.exit(1); });
