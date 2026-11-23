import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { buildXlsx } from "../src/lib/xlsx.ts";

test("xlsx has the sheets, escapes text and keeps numbers as numbers", () => {
  const files = unzipSync(buildXlsx([{ name: "ลูกค้า", rows: [["ชื่อ", "ยอด"], ["A & <B>", 120.5], ["x\ny", null]] }, { name: "ออเดอร์", rows: [["a"]] }]));
  assert.ok(files["xl/worksheets/sheet2.xml"]);
  const s1 = strFromU8(files["xl/worksheets/sheet1.xml"]);
  assert.match(s1, /A &amp; &lt;B&gt;/);
  assert.match(s1, /<c r="B2"><v>120.5<\/v><\/c>/);
  assert.match(strFromU8(files["xl/workbook.xml"]), /name="ลูกค้า"/);
});
