import assert from "node:assert/strict";
import { test } from "node:test";
import { checkFacts, checkKeywords, checkLength, checkVariety, extractSpeech, nextTitleNumber, parseSellingLines } from "../src/lib/scriptChecks.ts";

const say = (n: number, word = "ร้านเรามีเนื้อสดใหม่ทุกวัน") => Array.from({ length: n }, () => `🗣 ${word}`).join("\n");
const script = (hook: string, body: string[], cta: string) => `Hook\nA) ${hook}\n\n${body.map((b) => `🎬 ภาพ\n🗣 ${b}`).join("\n")}\n🗣 ${cta}\n📝 บนจอ: ราคา 259`;

test("length counts only 🗣 lines and hook A, ignoring bracketed slots", () => {
  const s = `A) สวัสดีครับ\n🗣 ${"ก".repeat(300)} [ยืนยันราคา] (หมายเหตุ)\n📝 ${"ข".repeat(500)}\n🗣 ${"ค".repeat(320)}`;
  const r = checkLength(s);
  assert.equal(r.hasSpoken, true);
  assert.equal(r.chars, 10 + 300 + 320);
  assert.equal(r.level, "pass");
  assert.equal(checkLength("🗣 สั้น").level, "fail");
  assert.equal(checkLength("ไม่มีบทพูด").level, "fail");
  assert.equal(checkLength(`🗣 ${"ก".repeat(900)}`).level, "warn");
  assert.equal(extractSpeech("A) ฮุก\nB) ฮุก2\n🗣 พูด").hook, "ฮุก");
});

test("selling lines parse quoted phrases, ignore notes/headings", () => {
  const ph = parseSellingLines('# หัวข้อ\n- "เนื้อสดใหม่ทุกวัน" (ต้องมีในท่อน Hook และ CTA)\n- หมูกระทะราคาเดียว 259\n\n• “คุ้มทุกคำ”');
  assert.deepEqual(ph, ["เนื้อสดใหม่ทุกวัน", "หมูกระทะราคาเดียว 259", "คุ้มทุกคำ"]);
});

test("keywords must be present and spread over the clip", () => {
  const phrases = ["เนื้อสดใหม่ทุกวัน", "คุ้มทุกคำ"];
  const filler = (i: number) => `เรื่องที่ ${i} เล่าไปเรื่อยๆ เพื่อให้ยาวพอสมควรในส่วนกลางของคลิปนี้ครับ`.repeat(2);
  const good = script("เนื้อสดใหม่ทุกวัน จริงไหม", [filler(1), "ย้ำอีกที เนื้อสดใหม่ทุกวัน", filler(2)], "มากินให้คุ้มทุกคำ");
  assert.equal(checkKeywords(good, phrases).level, "pass");
  const missing = script("สวัสดี", [filler(1)], "มากินสิ");
  const m = checkKeywords(missing, phrases);
  assert.equal(m.level, "fail");
  assert.equal(m.missing.length, 2);
  const clustered = script("เนื้อสดใหม่ทุกวัน คุ้มทุกคำ", [filler(1), filler(2), filler(3)], "มาทักได้เลย");
  assert.equal(checkKeywords(clustered, phrases).level, "warn");
  assert.equal(checkKeywords(good, []).level, "pass");
});

test("variety flags scripts that loop, passes distinct ones", () => {
  const a = script("ใครว่าหมูกระทะต้องแพง วันนี้พิสูจน์ให้ดู", ["ราคาเดียวกินได้ไม่อั้น เนื้อสดใหม่ทุกวัน ซอสสูตรเฉพาะ"], "ทักมาจองโต๊ะได้เลยวันนี้");
  const b = script("ใครว่าหมูกระทะต้องแพง วันนี้พิสูจน์ให้ดู", ["เนื้อสดใหม่ทุกวัน ราคาเดียวกินได้ไม่อั้น ซอสสูตรเฉพาะ"], "ทักมาจองโต๊ะได้เลยวันนี้");
  const c = script("เบื้องหลังก่อนเปิดร้านตีห้า เขาทำอะไรกัน", ["พาเดินเข้าครัว ดูการหั่นเนื้อ ล้างผัก เตรียมน้ำจิ้ม"], "ติดตามเพจไว้ ไม่พลาดโปรใหม่");
  const r = checkVariety([{ id: "a", title: "A", script: a }, { id: "b", title: "B", script: b }, { id: "c", title: "C", script: c }]);
  assert.notEqual(r.a.level, "pass");
  assert.notEqual(r.b.level, "pass");
  assert.equal(r.c.level, "pass");
  // also against the client's existing clips
  const r2 = checkVariety([{ id: "n", title: "ใหม่", script: a }], [{ id: "old", title: "เก่า", script: b }]);
  assert.notEqual(r2.n.level, "pass");
  assert.match(r2.n.message, /เก่า/);
});

test("three clips opening the same way are a pattern", () => {
  const mk = (i: number) => ({ id: `s${i}`, title: `S${i}`, script: script(`รู้ไหมว่าหมูกระทะ เรื่อง${["ราคา", "น้ำจิ้ม", "ถ่านไฟ"][i]}`, [`เนื้อหาไม่เหมือนกันเลยแต่ละเรื่อง ${["aaa111bbb", "ccc222ddd", "eee333fff"][i]} ยาวพอ`], ["ทัก", "โทร", "แวะมา"][i] + "ได้เลย") });
  const r = checkVariety([mk(0), mk(1), mk(2)]);
  assert.ok(Object.values(r).every((x) => x.level !== "pass"));
});

test("numbers not found in context are flagged; bracketed slots are not", () => {
  const s = "🗣 ราคาแค่ 259 บาท และโปร 1,500 บาท ส่วนนี้ [ยืนยัน 999]";
  const r = checkFacts(s, "เมนูหลัก ราคา 259 บาท");
  assert.deepEqual(r.unknown, ["1500"]);
  assert.equal(checkFacts("🗣 ราคา 259", "259").level, "pass");
});

test("next title number follows the queue", () => {
  assert.equal(nextTitleNumber(["3.01 ก", "3.02 ข", "2.09 ค"], "3"), "3.03");
  assert.equal(nextTitleNumber([], "4"), "4.01");
  assert.equal(nextTitleNumber(["1. เก่า"], "1"), "1.01");
});
