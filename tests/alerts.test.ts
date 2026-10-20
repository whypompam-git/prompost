import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, buildDigest, daysBetween, digestToText, type AlertInput } from "../src/lib/alerts.ts";

const base: AlertInput = {
  today: "2026-10-18",
  graceDays: 7,
  clients: [{ id: "c1", name: "ร้านก" }, { id: "c2", name: "ร้านข" }],
  staff: [{ id: "s1", name: "พอม" }],
  tasks: [],
  invoices: [],
  rounds: [],
  receipts: [],
  leave: [],
};

test("date helpers", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(daysBetween("2026-10-10", "2026-10-18"), 8);
});

test("nothing to report → no message", () => {
  assert.equal(digestToText(buildDigest(base), "18 ต.ค."), null);
});

test("tasks bucketed by due date; done tasks ignored", () => {
  const d = buildDigest({
    ...base,
    tasks: [
      { id: "1", title: "เลย", clientId: "c1", assigneeId: "s1", status: "todo", dueDate: "2026-10-15" },
      { id: "2", title: "วันนี้", clientId: "c1", assigneeId: null, status: "in_progress", dueDate: "2026-10-18" },
      { id: "3", title: "พรุ่งนี้", clientId: "c2", assigneeId: "s1", status: "todo", dueDate: "2026-10-19" },
      { id: "4", title: "เสร็จแล้ว", clientId: "c2", assigneeId: "s1", status: "done", dueDate: "2026-10-01" },
      { id: "5", title: "ไกล", clientId: "c2", assigneeId: "s1", status: "todo", dueDate: "2026-11-30" },
    ],
  });
  assert.deepEqual(d.tasksOverdue.map((t) => [t.title, t.days]), [["เลย", 3]]);
  assert.deepEqual(d.tasksToday.map((t) => [t.title, t.assignee]), [["วันนี้", "ยังไม่มอบหมาย"]]);
  assert.deepEqual(d.tasksTomorrow.map((t) => t.title), ["พรุ่งนี้"]);
});

test("unpaid invoice past due date, or past grace when it has no due date", () => {
  const d = buildDigest({
    ...base,
    invoices: [
      { id: "a", invoiceNo: "IV-A", clientId: "c1", status: "unpaid", dueDate: "2026-10-10", createdAt: "2026-10-01T00:00:00Z", total: 1000 },
      { id: "b", invoiceNo: "IV-B", clientId: "c1", status: "unpaid", dueDate: "2026-10-25", createdAt: "2026-10-01T00:00:00Z", total: 1000 },
      { id: "c", invoiceNo: "IV-C", clientId: "c2", status: "unpaid", createdAt: "2026-10-05T05:00:00Z", total: 500 },
      { id: "d", invoiceNo: "IV-D", clientId: "c2", status: "paid", dueDate: "2026-09-01", createdAt: "2026-08-01T00:00:00Z", total: 500 },
    ],
  });
  assert.deepEqual(d.overduePayments.map((p) => [p.label, p.days]), [["IV-A", 8], ["IV-C", 6]]);
});

test("billing round: only the newest round, only after the grace period, minus linked receipts", () => {
  const d = buildDigest({
    ...base,
    rounds: [
      { id: "old", clientId: "c1", packageName: "เก่า", amount: 9000, assignedAt: "2026-06-01T00:00:00Z" },
      { id: "new", clientId: "c1", packageName: "ใหม่", amount: 15000, assignedAt: "2026-10-01T00:00:00Z" },
      { id: "fresh", clientId: "c2", packageName: "สด", amount: 5000, assignedAt: "2026-10-16T00:00:00Z" },
    ],
    receipts: [{ clientPackageId: "new", amount: 7500 }, { clientPackageId: "old", amount: 9000 }],
  });
  assert.equal(d.overduePayments.length, 1);
  assert.deepEqual([d.overduePayments[0].client, d.overduePayments[0].amount, d.overduePayments[0].days], ["ร้านก", 7500, 17]);
});

test("fully paid round is not reported; text lists sections", () => {
  const paid = buildDigest({
    ...base,
    rounds: [{ id: "r", clientId: "c1", packageName: "x", amount: 100, assignedAt: "2026-09-01T00:00:00Z" }],
    receipts: [{ clientPackageId: "r", amount: 100 }],
    leave: [{ staffId: "s1", dateFrom: "2026-10-20", dateTo: "2026-10-21", status: "pending" }],
  });
  assert.equal(paid.overduePayments.length, 0);
  const text = digestToText(paid, "18 ต.ค. 2569")!;
  assert.match(text, /สรุปประจำวัน 18 ต.ค. 2569/);
  assert.match(text, /คำขอลารออนุมัติ \(1\)/);
  assert.match(text, /พอม: 2026-10-20 – 2026-10-21/);
});

test("long lists are truncated", () => {
  const tasks = Array.from({ length: 12 }, (_, n) => ({ id: String(n), title: `t${n}`, clientId: "c1", assigneeId: "s1", status: "todo", dueDate: "2026-10-18" }));
  const text = digestToText(buildDigest({ ...base, tasks }), "x")!;
  assert.match(text, /งานส่งวันนี้ \(12\)/);
  assert.match(text, /และอีก 4 รายการ/);
});

test("channel filtering keeps only subscribed sections", async () => {
  const { filterDigest } = await import("../src/lib/alerts.ts");
  const d = {
    overduePayments: [{ label: "a", client: "c", amount: 1, days: 9 }],
    tasksOverdue: [{ title: "t", client: "c", assignee: "x", days: 1 }],
    tasksToday: [],
    tasksTomorrow: [],
    pendingLeave: [{ staff: "s", from: "2026-01-01", to: "2026-01-01" }],
  };
  const r = filterDigest(d, ["tasks"]);
  assert.equal(r.overduePayments.length, 0);
  assert.equal(r.tasksOverdue.length, 1);
  assert.equal(r.pendingLeave.length, 0);
});

test("a channel is due at its hour (or up to 2h late) once a day", async () => {
  const { channelDue } = await import("../src/lib/alerts.ts");
  const c = { send_hour: 18, enabled: true, last_sent_on: null };
  assert.equal(channelDue(c, 18, "2026-10-20"), true);
  assert.equal(channelDue(c, 20, "2026-10-20"), true);
  assert.equal(channelDue(c, 21, "2026-10-20"), false);
  assert.equal(channelDue(c, 17, "2026-10-20"), false);
  assert.equal(channelDue({ ...c, last_sent_on: "2026-10-20" }, 18, "2026-10-20"), false);
  assert.equal(channelDue({ ...c, enabled: false }, 18, "2026-10-20"), false);
});

test("tasks waiting on the client (Plan/Pending) are not overdue work", () => {
  const d = buildDigest({ ...base, tasks: [{ id: "w", title: "รอลูกค้า", clientId: "c1", assigneeId: "s1", status: "waiting", dueDate: "2026-10-01" }] });
  assert.equal(d.tasksOverdue.length, 0);
});
