import assert from "node:assert/strict";
import { test } from "node:test";
import { applyClientAction, applyQcRevision, enterStage, legacyToStage, settle } from "../src/lib/workflow.ts";

test("shoot done without a file waits for the upload, with a file goes to edit", () => {
  assert.deepEqual(settle({ type: "shoot", status: "done" }), { type: "shoot", status: "done", revisionCount: 0, moved: false });
  const r = settle({ type: "shoot", status: "done", footageUrl: "drive.google.com/x" });
  assert.equal(r.type, "edit");
  assert.equal(r.status, "todo");
});

test("edit done -> QC in review; QC done -> pending (waiting for client)", () => {
  assert.equal(settle({ type: "edit", status: "done" }).type, "qc");
  const r = settle({ type: "qc", status: "done" });
  assert.deepEqual([r.type, r.status], ["pending", "waiting"]);
});

test("a status that doesn't exist in the stage falls back to the default", () => {
  assert.equal(settle({ type: "plan", status: "todo" }).status, "waiting");
});

test("entering a stage by hand uses its default status", () => {
  assert.equal(enterStage("qc", {}).status, "review");
  assert.equal(enterStage("shoot", {}).status, "todo");
});

test("client choices on a plan", () => {
  const plan = { type: "plan", status: "waiting" as const, revisionCount: 1 };
  assert.deepEqual(applyClientAction(plan, "use", undefined), { ok: true, type: "shoot", status: "todo", revisionCount: 1, needsBrief: false });
  assert.equal((applyClientAction(plan, "reject", undefined) as { type: string }).type, "rejected");
  assert.equal(applyClientAction(plan, "revise", "  ").ok, false);
  const r = applyClientAction(plan, "revise", "แก้ฉาก 2");
  assert.deepEqual([r.ok && r.type, r.ok && r.revisionCount], ["plan", 2]);
});

test("client choices on a pending clip count revisions and go back to editing", () => {
  const pending = { type: "pending", status: "waiting" as const, revisionCount: 2 };
  assert.equal((applyClientAction(pending, "pass", undefined) as { type: string }).type, "approved");
  const r = applyClientAction(pending, "revise", "ตัดให้สั้นลง");
  assert.deepEqual(r, { ok: true, type: "edit", status: "todo", revisionCount: 3, needsBrief: true });
});

test("clients can't act outside the waiting stages, and 'ผ่าน' can't be undone", () => {
  assert.equal(applyClientAction({ type: "edit", status: "todo" }, "pass", undefined).ok, false);
  assert.equal(applyClientAction({ type: "approved", status: "done" }, "revise", "x").ok, false);
  assert.equal(applyClientAction({ type: "plan", status: "waiting" }, "pass", undefined).ok, false);
});

test("QC revision needs a brief and returns to edit", () => {
  assert.equal(applyQcRevision({ type: "qc", status: "review" }, "").ok, false);
  const r = applyQcRevision({ type: "qc", status: "review", revisionCount: 0 }, "เสียงเบา");
  assert.deepEqual([r.ok && r.type, r.ok && r.revisionCount], ["edit", 1]);
  assert.equal(applyQcRevision({ type: "edit", status: "todo" }, "x").ok, false);
});

test("legacy mapping", () => {
  assert.deepEqual(legacyToStage("shoot", "todo"), { type: "shoot", status: "todo" });
  assert.deepEqual(legacyToStage("shoot", "in_progress"), { type: "shoot", status: "todo" });
  assert.deepEqual(legacyToStage("shoot", "done", "http://f"), { type: "edit", status: "todo" });
  assert.deepEqual(legacyToStage("shoot", "done"), { type: "shoot", status: "done" });
  assert.deepEqual(legacyToStage("edit", "done"), { type: "qc", status: "review" });
  assert.deepEqual(legacyToStage("review", "done"), { type: "pending", status: "waiting" });
  assert.deepEqual(legacyToStage("deliver", "done"), { type: "posted", status: "done" });
  assert.deepEqual(legacyToStage("other", "todo"), { type: "other", status: "todo" });
});

test("stage summary: QC counts under editing, rejected/other are not clips", async () => {
  const { summarizeStages } = await import("../src/lib/workflow.ts");
  const r = summarizeStages([{ type: "plan" }, { type: "edit" }, { type: "qc" }, { type: "posted" }, { type: "rejected" }, { type: "other" }]);
  assert.equal(r.total, 4);
  assert.equal(r.groups.find((g) => g.key === "edit")?.count, 2);
});
