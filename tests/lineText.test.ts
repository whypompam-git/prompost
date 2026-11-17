import assert from "node:assert/strict";
import { test } from "node:test";
import { lineTextsForTask } from "../src/lib/lineText.ts";

const base = { clientName: "ร้าน A", title: "คลิป 3", editorName: "มิน", assigneeName: "พอม", editDate: "2026-11-20", footageUrl: "https://drive/x", link: "https://prompost.app/tasks/1" };
const keys = (ctx: Parameters<typeof lineTextsForTask>[0]) => lineTextsForTask(ctx).map((t) => t.key);

test("an edit-stage clip offers the assignment message with deadline, footage and link", () => {
  const [t] = lineTextsForTask({ ...base, stage: "edit", notes: "เน้นซับ" });
  assert.equal(t.key, "assign");
  assert.match(t.text, /ร้าน A · คลิป 3/);
  assert.match(t.text, /ถึง: มิน/);
  assert.match(t.text, /https:\/\/drive\/x/);
  assert.match(t.text, /หมายเหตุ: เน้นซับ/);
});

test("a clip being revised leads with the revision message and its brief", () => {
  const r = lineTextsForTask({ ...base, stage: "edit", revisionCount: 2, revisionBrief: "ตัดช่วงต้น 2 วิ" });
  assert.deepEqual(r.map((x) => x.key), ["revise", "assign"]);
  assert.match(r[0].text, /รอบที่ 2[\s\S]*ตัดช่วงต้น 2 วิ/);
});

test("each stage gets its own message and empty lines are left out", () => {
  assert.deepEqual(keys({ ...base, stage: "qc" }), ["qc_ready"]);
  assert.deepEqual(keys({ ...base, stage: "pending" }), ["sent_client"]);
  assert.deepEqual(keys({ ...base, stage: "approved" }), ["approved"]);
  assert.deepEqual(keys({ ...base, stage: "approved", finalUrl: "https://drive/final" }), ["final"]);
  assert.deepEqual(keys({ ...base, stage: "plan" }), []);
  const [t] = lineTextsForTask({ clientName: "ร้าน A", title: "x", stage: "edit" });
  assert.doesNotMatch(t.text, /undefined|null|: $/m);
});
