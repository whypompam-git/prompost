import assert from "node:assert/strict";
import { test } from "node:test";
import { countGoal, goalWindow } from "../src/lib/goalProgress.ts";

test("goal window: this month, or from a start date", () => {
  assert.deepEqual(goalWindow({ mode: "month", startDate: null }, "2026-02-14"), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(goalWindow({ mode: "month", startDate: "2026-01-05" }, "2026-11-14"), { from: "2026-11-01", to: "2026-11-30" });
  assert.deepEqual(goalWindow({ mode: "from", startDate: "2026-10-15" }, "2026-11-14"), { from: "2026-10-15", to: null });
  assert.deepEqual(goalWindow({ mode: "from", startDate: null }, "2026-11-14"), { from: "2026-11-01", to: "2026-11-30" });
});

test("counts edited clips that passed QC and shot clips, once each", () => {
  const win = { from: "2026-11-01", to: "2026-11-30" };
  const tasks = [
    { id: "1", type: "approved", editorId: "me", editDate: "2026-11-03" },
    { id: "2", type: "qc", editorId: "me", editDate: "2026-11-04" }, // not passed yet
    { id: "3", type: "posted", editorId: "me", editDate: "2026-10-30" }, // last month
    { id: "4", type: "edit", shotBy: "me", scheduledDate: "2026-11-02" },
    { id: "5", type: "shoot", shotBy: "me", scheduledDate: "2026-11-02" }, // not shot yet
    { id: "6", type: "pending", editorId: "me", shotBy: "me", editDate: "2026-11-10", scheduledDate: "2026-11-08" },
    { id: "7", type: "approved", editorId: "other", editDate: "2026-11-03" },
  ];
  assert.deepEqual(countGoal("me", tasks, win), { edit: 2, shoot: 2, total: 3 });
});
