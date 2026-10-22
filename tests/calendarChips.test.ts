import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCalendarChips } from "../src/lib/calendarChips.ts";
import type { Client, Queue, Staff, Task } from "../src/lib/types.ts";

const clients = [{ id: "c1", name: "OYOKO" }] as Client[];
const staff = [{ id: "s1", name: "นุ่น" }, { id: "s2", name: "กาย" }] as Staff[];
const queues: Queue[] = [{ id: "q1", clientId: "c1", name: "คิว1", shootDate: "2026-11-05", crew: ["s1", "s2"] }];
const task = (o: Partial<Task>): Task => ({ id: Math.random().toString(), clientId: "c1", title: "t", type: "shoot", status: "todo", assigneeId: null, scheduledDate: "2026-10-01", dueDate: "2026-11-12", ...o }) as Task;

test("plan clips never appear; shoot clips group into one chip per queue", () => {
  const tasks = [
    ...Array.from({ length: 10 }, () => task({ queueId: "q1" })),
    task({ type: "plan", status: "waiting" }),
    task({ type: "shoot" }), // no queue yet -> not on the calendar
  ];
  const chips = buildCalendarChips({ tasks, queues, clients, staff });
  const shoot = chips.filter((c) => c.group === "shoot");
  assert.equal(shoot.length, 1);
  assert.equal(shoot[0].count, 10);
  assert.equal(shoot[0].label, "ถ่าย คิว1-OYOKO");
  assert.deepEqual(shoot[0].crew, ["นุ่น", "กาย"]);
  assert.equal(shoot[0].date, "2026-11-05");
  assert.equal(shoot[0].href, "/clients/c1?stage=shoot&queue=q1");
  // the delivery chip sits on the due date, regardless of the shoot day
  assert.equal(chips.filter((c) => c.group === "send")[0].count, 10);
});

test("edit/QC group by edit date (วันตัดต่อ); delivery chips use the due date", () => {
  const tasks = [
    task({ type: "edit", queueId: "q1", assigneeId: "s1", editDate: "2026-11-12" }),
    task({ type: "qc", status: "review", queueId: "q1", assigneeId: "s2", editDate: "2026-11-12" }),
    task({ type: "edit", queueId: "q1", editDate: "2026-11-20" }),
    task({ type: "edit", queueId: "q1" }), // no edit date -> no edit chip
    task({ type: "pending", status: "waiting", queueId: "q1" }),
    task({ type: "posted", status: "done", queueId: "q1" }),
  ];
  const chips = buildCalendarChips({ tasks, queues, clients, staff });
  const edit = chips.find((c) => c.group === "edit" && c.date === "2026-11-12")!;
  assert.equal(edit.count, 2);
  assert.deepEqual(edit.crew.sort(), ["กาย", "นุ่น"]);
  assert.equal(chips.filter((c) => c.group === "edit").length, 2);
  assert.equal(chips.find((c) => c.group === "send")?.label, "ส่งงาน คิว1-OYOKO");
  assert.equal(chips.find((c) => c.group === "send" && c.date === "2026-11-12")!.count, 5);
  assert.equal(chips.some((c) => c.label.includes("Post")), false);
});

test("misc tasks stay as single chips on their own date; finished ones are hidden", () => {
  const chips = buildCalendarChips({
    tasks: [task({ type: "other", title: "ประชุม", scheduledDate: "2026-11-03" }), task({ type: "other", status: "done" })],
    queues, clients, staff,
  });
  assert.equal(chips.length, 1);
  assert.equal(chips[0].label, "ประชุม");
});
