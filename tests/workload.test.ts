import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWorkBoard } from "../src/lib/workload.ts";
import type { Client, Queue, Staff, Task } from "../src/lib/types.ts";

const clients = [{ id: "c1", name: "OYOKO", managerId: "boss" }, { id: "c2", name: "ร้านข" }] as Client[];
const staff = [{ id: "nun" }, { id: "guy" }, { id: "boss" }] as Staff[];
const queues: Queue[] = [{ id: "q1", clientId: "c1", name: "คิว1", shootDate: "2026-10-24", crew: ["nun", "guy"] }];
const task = (o: Partial<Task>): Task => ({ id: Math.random().toString(36).slice(2), clientId: "c1", title: "t", type: "edit", status: "todo", assigneeId: "nun", scheduledDate: "2026-10-01", dueDate: "2026-10-30", editDate: "2026-10-24", ...o }) as Task;
const board = (tasks: Task[], days = 7) => buildWorkBoard({ tasks, queues, clients, staff, today: "2026-10-23", days });

test("shoot clips become one card per queue in each crew member's row", () => {
  const b = board(Array.from({ length: 10 }, () => task({ type: "shoot", queueId: "q1", editDate: null })));
  const shoot = b.cards.filter((c) => c.kind === "shoot");
  assert.deepEqual(shoot.map((c) => c.rowId).sort(), ["guy", "nun"]);
  assert.equal(shoot[0].title, "คิว1 · 10 คลิป");
  assert.equal(shoot[0].column, "2026-10-24");
  assert.equal(shoot[0].deadline, "2026-10-30");
});

test("edit/QC cards use the edit date and the assignee's row; undated ones go to waiting", () => {
  const b = board([
    task({ title: "A", editDate: "2026-10-23" }),
    task({ title: "B", editDate: null }),
    task({ type: "qc", status: "review", title: "C", editDate: "2026-10-25", assigneeId: null }),
  ]);
  const edit = b.cards.find((c) => c.kind === "edit")!;
  assert.deepEqual([edit.rowId, edit.column, edit.title], ["nun", "2026-10-23", "A"]);
  assert.equal(b.cards.find((c) => c.kind === "qc")!.rowId, "none");
  assert.equal(b.waiting.find((w) => w.clientId === "c1")!.noEditDate, 1);
});

test("same client/assignee/day edit clips merge into one counted card", () => {
  const b = board([task({ title: "A" }), task({ title: "B" }), task({ title: "C" })]);
  const c = b.cards.find((x) => x.kind === "edit")!;
  assert.equal(c.count, 3);
  assert.equal(c.title, "3 คลิป");
  assert.equal(c.href, "/clients/c1?stage=edit");
});

test("delivery lands on the client manager's row at the delivery date and disappears after hand-off", () => {
  const b = board([task({ dueDate: "2026-10-27" }), task({ type: "pending", status: "waiting", dueDate: "2026-10-27" })]);
  const d = b.cards.filter((c) => c.kind === "delivery");
  assert.equal(d.length, 1);
  assert.deepEqual([d[0].rowId, d[0].column, d[0].title], ["boss", "2026-10-27", "ส่งงาน · 1 คลิป"]);
  // no manager -> "none"
  const b2 = board([task({ clientId: "c2", dueDate: "2026-10-27" })]);
  assert.equal(b2.cards.find((c) => c.kind === "delivery")!.rowId, "none");
});

test("past dates fall into 'overdue'; dates beyond the window are left out; Plan/posted never appear", () => {
  const b = board([
    task({ editDate: "2026-10-20" }),
    task({ editDate: "2026-11-30" }),
    task({ type: "plan", status: "waiting" }),
    task({ type: "posted", status: "done" }),
  ]);
  assert.equal(b.cards.filter((c) => c.kind === "edit").length, 1);
  assert.equal(b.cards.find((c) => c.kind === "edit")!.column, "overdue");
  assert.equal(b.waiting.find((w) => w.clientId === "c1")!.plan, 1);
  assert.equal(b.cards.some((c) => c.kind === "delivery" && c.column !== "overdue" && c.column !== "2026-10-30"), false);
});

test("shoot clips without a queue/date are counted as waiting for a queue", () => {
  const b = board([task({ type: "shoot", queueId: null })]);
  assert.equal(b.cards.filter((c) => c.kind === "shoot").length, 0);
  assert.equal(b.waiting[0].unqueued, 1);
});

test("editing cards go to the editor, QC cards to the responsible person", () => {
  const b = board([
    task({ title: "E1", editorId: "guy", assigneeId: "nun" }),
    task({ type: "qc", status: "review", title: "Q1", editorId: "guy", assigneeId: "nun" }),
    task({ title: "E2", editorId: null, assigneeId: "nun", clientId: "c2" }), // no editor → responsible person
  ]);
  assert.equal(b.cards.find((c) => c.kind === "edit" && c.clientId === "c1")!.rowId, "guy");
  assert.equal(b.cards.find((c) => c.kind === "qc")!.rowId, "nun");
  assert.equal(b.cards.find((c) => c.kind === "edit" && c.clientId === "c2")!.rowId, "nun");
});
