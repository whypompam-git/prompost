import assert from "node:assert/strict";
import { test } from "node:test";
import { collectClientRows, findClients, fixDanglingDrafts, type Dump } from "../src/lib/backupRestore.ts";

const dump: Dump = {
  takenAt: "2026-11-15T00:00:00Z",
  tables: {
    clients: [{ id: "c1", name: "ร้านทดสอบ", name_en: "TestShop", slug: "testshop" }, { id: "c2", name: "อื่น", slug: "other" }],
    tasks: [{ id: "t1", client_id: "c1" }, { id: "t2", client_id: "c2" }],
    queues: [{ id: "q1", client_id: "c1" }],
    task_revisions: [{ id: "r1", task_id: "t1" }, { id: "r2", task_id: "t2" }],
    draft_comments: [{ id: "d1", task_id: "t1", draft_id: "gone" }],
  },
};

test("finds a client by Thai name, English name or link", () => {
  assert.deepEqual(findClients(dump, "testshop").map((c) => c.id), ["c1"]);
  assert.deepEqual(findClients(dump, "ทดสอบ").map((c) => c.id), ["c1"]);
  assert.deepEqual(findClients(dump, ""), []);
});

test("collects the client and only its own rows, parents first", () => {
  const g = collectClientRows(dump, "c1");
  assert.deepEqual(g.map((x) => x.table), ["clients", "queues", "tasks", "task_revisions", "draft_comments"]);
  assert.deepEqual(g.find((x) => x.table === "task_revisions")!.rows.map((r) => r.id), ["r1"]);
  assert.deepEqual(collectClientRows(dump, "missing"), []);
});

test("comments keep their text when their draft video isn't restored", () => {
  const g = fixDanglingDrafts(collectClientRows(dump, "c1"));
  assert.equal(g.find((x) => x.table === "draft_comments")!.rows[0].draft_id, null);
});
