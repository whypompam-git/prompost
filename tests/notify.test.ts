import assert from "node:assert/strict";
import { test } from "node:test";
import { planNotifications } from "../src/lib/notify.ts";

const base = { taskTitle: "คลิป 3", clientName: "ร้านก" };

test("client revision goes to assignee and manager, with the round and brief", () => {
  const out = planNotifications(
    { ...base, kind: "client_revise", round: 2, brief: "ตัดต้นคลิปออก" },
    { assigneeId: "a", managerId: "m" },
  );
  assert.deepEqual(out.map((n) => n.recipientId).sort(), ["a", "m"]);
  assert.match(out[0].title, /รอบที่ 2/);
  assert.equal(out[0].body, "ตัดต้นคลิปออก");
});

test("the actor is never notified about their own action", () => {
  const out = planNotifications({ ...base, kind: "qc_revise" }, { actorId: "a", assigneeId: "a", managerId: "m" });
  assert.deepEqual(out.map((n) => n.recipientId), ["m"]);
});

test("same person as assignee and manager gets one notification", () => {
  assert.equal(planNotifications({ ...base, kind: "client_pass" }, { assigneeId: "a", managerId: "a" }).length, 1);
});

test("assigned notifies only the new assignee, and nobody when it's self-assigned", () => {
  assert.deepEqual(
    planNotifications({ ...base, kind: "assigned" }, { actorId: "boss", newAssigneeId: "x", assigneeId: "old", managerId: "m" }).map((n) => n.recipientId),
    ["x"],
  );
  assert.equal(planNotifications({ ...base, kind: "assigned" }, { actorId: "x", newAssigneeId: "x" }).length, 0);
});

test("handoff names the new stage", () => {
  const [n] = planNotifications({ ...base, kind: "handoff", toStage: "edit" }, { assigneeId: "a" });
  assert.match(n.title, /ตัดต่อ/);
});
