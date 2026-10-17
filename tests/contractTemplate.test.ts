import assert from "node:assert/strict";
import { test } from "node:test";
import { fillVariables, findPlaceholders, installmentsText, thaiBahtText } from "../src/lib/contractTemplate.ts";

test("baht in words", () => {
  assert.equal(thaiBahtText(0), "ศูนย์บาทถ้วน");
  assert.equal(thaiBahtText(1), "หนึ่งบาทถ้วน");
  assert.equal(thaiBahtText(11), "สิบเอ็ดบาทถ้วน");
  assert.equal(thaiBahtText(21), "ยี่สิบเอ็ดบาทถ้วน");
  assert.equal(thaiBahtText(101), "หนึ่งร้อยเอ็ดบาทถ้วน");
  assert.equal(thaiBahtText(9900), "เก้าพันเก้าร้อยบาทถ้วน");
  assert.equal(thaiBahtText(17900), "หนึ่งหมื่นเจ็ดพันเก้าร้อยบาทถ้วน");
  assert.equal(thaiBahtText(1_000_000), "หนึ่งล้านบาทถ้วน");
  assert.equal(thaiBahtText(15000.5), "หนึ่งหมื่นห้าพันบาทห้าสิบสตางค์");
});

test("variables are filled, unknown ones left alone", () => {
  const party = { name: "บริษัท A", address: "", taxId: "", phone: "" };
  const out = fillVariables("{{client_name}} จ่าย {{total}} ({{total_text}}) {{nope}}", {
    signDate: "2026-10-18",
    total: 15000,
    installments: [],
    client: party,
    seller: party,
  });
  assert.equal(out, "บริษัท A จ่าย 15,000 (หนึ่งหมื่นห้าพันบาทถ้วน) {{nope}}");
});

test("installments render one line each; empty due means on signing", () => {
  const text = installmentsText([
    { label: "งวดที่ 1 (มัดจำ)", percent: 50, amount: 7500, due: "" },
    { label: "งวดที่ 2", percent: 50, amount: 7500, due: "2026-11-20" },
  ]);
  assert.match(text, /งวดที่ 1 \(มัดจำ\) 50%: จำนวนเงิน 7,500 บาท ณ วันลงนามในสัญญานี้/);
  assert.match(text, /งวดที่ 2 50%: จำนวนเงิน 7,500 บาท ภายในวันที่ 20 พฤศจิกายน 2569/);
});

test("unfilled [ระบุ…] placeholders are detected", () => {
  assert.deepEqual(findPlaceholders(["จำนวน [ระบุจำนวน] คลิป และ [ระบุ เช่น 1,000 บาท/ครั้ง]", "ok"]), [
    "[ระบุจำนวน]",
    "[ระบุ เช่น 1,000 บาท/ครั้ง]",
  ]);
  assert.deepEqual(findPlaceholders(["ครบแล้ว"]), []);
});
