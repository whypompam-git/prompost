import assert from "node:assert/strict";
import { test } from "node:test";
import { firstUrl, mapSheet, parseCsv, sheetCsvUrl } from "../src/lib/mcSheet.ts";

const csv = [
  'Submission ID,Respondent ID,Submitted at,รูปโปรไฟล์,คำนำหน้า,ชื่อจริง-นามสกุล,ชื่อเล่น,อายุ,ส่วนสูง,น้ำหนัก,เรทราคาที่ต้องการ/ต่อคิว (3hr),เบอร์โทรศัพท์,Line ID,ลิงก์ IG,ลิงก์ Facebook,ลิงก์Facebook,คาแรคเตอร์ / สไตล์การทำงาน,ความสามารถพิเศษ,ประสบการณ์การทำงาน,ลิงก์ผลงาน',
  'sub1,r1,2026-10-01 10:30:00,"photo.jpg (https://storage.example.so/a.jpg)",นางสาว,ทดสอบ ตัวอย่าง,มด,25,165,50,3000,0800000000,mdline,https://ig/x,,https://fb/y,"ร่าเริง, ""พูดเก่ง""","ร้องเพลง\nเต้น",3 ปี,https://work/z',
  ',r2,,,นาย,ไม่มีไอดี,โบ,,,,,,,,,,,,,',
  'sub3,r3,2026-10-02 9:05:00,,นาย,ไม่มีรูป,ต้น,30,,,,,,,,,,,,',
].join("\r\n");

test("CSV parsing handles quotes, escaped quotes and newlines in cells", () => {
  const rows = parseCsv(csv);
  assert.equal(rows.length, 4);
  assert.equal(rows[1][16], 'ร่าเริง, "พูดเก่ง"');
  assert.equal(rows[1][17], "ร้องเพลง\nเต้น");
});

test("rows map by header name; duplicate Facebook columns merge; photo URL is extracted", () => {
  const { profiles, missing } = mapSheet(parseCsv(csv));
  assert.deepEqual(missing, []);
  assert.equal(profiles.length, 2); // the row without a Submission ID is skipped
  const a = profiles[0];
  assert.equal(a.nickname, "มด");
  assert.equal(a.facebook, "https://fb/y");
  assert.equal(a.photo_source, "https://storage.example.so/a.jpg");
  assert.equal(a.sheet_rate, "3000");
  assert.equal(a.submitted_at, "2026-10-01T10:30:00.000Z");
  assert.equal(profiles[1].submitted_at, "2026-10-02T09:05:00.000Z"); // single-digit hour
  assert.equal(profiles[1].photo_source, null);
});

test("an unrecognised sheet is reported, not half-imported", () => {
  const r = mapSheet(parseCsv("a,b\n1,2"));
  assert.equal(r.profiles.length, 0);
  assert.ok(r.missing.length > 0);
});

test("sheet URL → CSV export URL (keeps the tab)", () => {
  assert.equal(sheetCsvUrl("https://docs.google.com/spreadsheets/d/abc_123/edit?usp=sharing"), "https://docs.google.com/spreadsheets/d/abc_123/export?format=csv");
  assert.equal(sheetCsvUrl("https://docs.google.com/spreadsheets/d/abc/edit#gid=77"), "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=77");
  assert.equal(sheetCsvUrl("https://example.com"), null);
  assert.equal(firstUrl("x https://a.b/c.png) y"), "https://a.b/c.png");
});
