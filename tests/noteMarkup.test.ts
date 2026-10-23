import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNote, stripNoteMarkup, wrapSelection } from "../src/lib/noteMarkup.ts";

test("bold and highlight segments, plain text untouched", () => {
  assert.deepEqual(parseNote("คุยเรื่อง **ราคา** และ ==ส่งงานวันศุกร์== เรียบร้อย"), [
    { text: "คุยเรื่อง " },
    { text: "ราคา", bold: true },
    { text: " และ " },
    { text: "ส่งงานวันศุกร์", mark: true },
    { text: " เรียบร้อย" },
  ]);
  assert.deepEqual(parseNote("ธรรมดา"), [{ text: "ธรรมดา" }]);
  assert.deepEqual(parseNote("2 ** 3 ไม่ใช่"), [{ text: "2 ** 3 ไม่ใช่" }]);
});

test("preview strips markers; wrapSelection wraps or inserts a placeholder", () => {
  assert.equal(stripNoteMarkup("a **b** ==c=="), "a b c");
  const r = wrapSelection("ราคา 5000 บาท", 5, 9, "==");
  assert.equal(r.value, "ราคา ==5000== บาท");
  assert.equal(r.value.slice(r.selStart, r.selEnd), "5000");
  assert.match(wrapSelection("", 0, 0, "**").value, /^\*\*.+\*\*$/);
});
