import test from "node:test";
import assert from "node:assert/strict";
import { freelanceProgress, monthlyProgress, withholdingFor } from "../src/lib/contractProgress.ts";

test("freelance progress counts clips tied to the contract", () => {
  const p = freelanceProgress("c1", [
    { contractId: "c1", type: "edit" },
    { contractId: "c1", type: "qc" },
    { contractId: "c1", type: "posted" },
    { contractId: "c2", type: "posted" },
  ]);
  assert.deepEqual(p, { assigned: 3, delivered: 2, passed: 1 });
});

test("monthly progress by edit date and distinct shoot days", () => {
  const p = monthlyProgress(
    "s1",
    "2026-11",
    [
      { editorId: "s1", type: "approved", editDate: "2026-11-03" },
      { editorId: "s1", type: "edit", editDate: "2026-11-20" },
      { editorId: "s1", type: "posted", editDate: "2026-10-30" },
      { shotBy: "s1", type: "edit", scheduledDate: "2026-11-02" },
    ],
    [{ crew: ["s1"], shootDate: "2026-11-02" }, { crew: ["s1"], shootDate: "2026-11-05" }, { crew: ["s1"], shootDate: "2026-11-25" }],
    "2026-11-06",
  );
  assert.deepEqual(p, { clipsPlanned: 2, clipsPassed: 1, shootDays: 2 });
  assert.equal(withholdingFor(10000, true), 300);
});
