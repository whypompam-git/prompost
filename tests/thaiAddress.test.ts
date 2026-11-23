import test from "node:test";
import assert from "node:assert/strict";
import { splitThaiAddress } from "../src/lib/thaiAddress.ts";

// made-up addresses only (this repo is public)
test("Bangkok address with แขวง / เขต", () => {
  const a = splitThaiAddress("1/2 ถ.ตัวอย่าง ซ.5 แขวงสมมติ เขตทดสอบ กรุงเทพ 10999");
  assert.equal(a.subdistrict, "สมมติ");
  assert.equal(a.district, "ทดสอบ");
  assert.equal(a.province, "กรุงเทพมหานคร");
  assert.equal(a.postcode, "10999");
  assert.equal(a.check, "");
  assert.match(a.line, /^1\/2 ถ\.ตัวอย่าง/);
});

test("province addresses with ต. อำเภอ จังหวัด", () => {
  const a = splitThaiAddress("9 ม.3 ต.ตัวอย่าง อำเภอเมืองสมมติ จังหวัดสมมติ 99000");
  assert.equal(a.subdistrict, "ตัวอย่าง");
  assert.equal(a.district, "เมืองสมมติ");
  assert.equal(a.province, "สมมติ");
  assert.equal(a.postcode, "99000");
});

test("missing parts are flagged for a manual check", () => {
  const a = splitThaiAddress("99 หมู่บ้านตัวอย่าง");
  assert.match(a.check, /รหัสไปรษณีย์/);
});
