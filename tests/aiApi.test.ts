import assert from "node:assert/strict";
import { test } from "node:test";
import { isUuid, sanitizeExpect, sanitizePatch, validateNewTasks } from "../src/lib/aiApi.ts";

const good = { title: "1.01 ชื่อ", type: "shoot", status: "todo", category: "mass", scheduledDate: "2026-10-18", dueDate: "2026-10-25", script: "สคริปต์", shots: ["a"], notes: "n" };

test("a valid batch is normalised (defaults, nulls, trimming)", () => {
  const r = validateNewTasks([{ title: " ชื่อ ", scheduledDate: "2026-10-18", dueDate: "2026-10-18" }]);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.rows[0], {
    title: "ชื่อ", type: "plan", status: "waiting", assignee_id: null, scheduled_date: "2026-10-18", due_date: "2026-10-18",
    notes: null, ref_link: null, content_category: null, script_text: null, shots: [], equipment: [], post_date: null,
  });
});

test("a status that does not exist in the stage is rejected", () => {
  assert.equal(validateNewTasks([{ ...good, type: "plan", status: "todo" }]).ok, false);
  assert.equal(validateNewTasks([{ ...good, type: "shoot", status: "done" }]).ok, true);
});

test("bad batches are rejected with readable errors", () => {
  assert.equal(validateNewTasks([]).ok, false);
  assert.equal(validateNewTasks("x").ok, false);
  for (const bad of [
    { ...good, title: "" },
    { ...good, type: "video" },
    { ...good, status: "finished" },
    { ...good, category: "other" },
    { ...good, scheduledDate: "18/10/2026" },
    { ...good, dueDate: undefined },
    { ...good, shots: "a" },
    { ...good, script: 5 },
  ]) assert.equal(validateNewTasks([bad]).ok, false, JSON.stringify(bad));
  const dup = validateNewTasks([good, good]);
  assert.equal(dup.ok, false);
  assert.equal(validateNewTasks(Array.from({ length: 201 }, (_, i) => ({ ...good, title: `t${i}` }))).ok, false);
});

test("patch whitelist: content columns only, never status/assignee/client", () => {
  assert.equal(sanitizePatch({ title: "x", script_text: "y", shots: ["a"], scheduled_date: "2026-10-18", ref_link: null }).ok, true);
  for (const bad of [{ status: "done" }, { assignee_id: "x" }, { client_id: "x" }, { id: "x" }, { deleted: true }, {}, [], null, { title: "" }, { scheduled_date: "x" }, { shots: [1] }, { content_category: "zzz" }]) {
    assert.equal(sanitizePatch(bad).ok, false, JSON.stringify(bad));
  }
});

test("expect only allows comparable scalar columns", () => {
  assert.deepEqual(sanitizeExpect(undefined), { ok: true, expect: {} });
  assert.equal(sanitizeExpect({ script_text: "a", notes: null }).ok, true);
  assert.equal(sanitizeExpect({ shots: "x" }).ok, false);
  assert.equal(sanitizeExpect({ title: 5 }).ok, false);
});

test("uuid check", () => {
  assert.equal(isUuid("45cdac2d-0114-4758-8813-83b3d04e0dc5"), true);
  assert.equal(isUuid("1;drop table tasks"), false);
});
