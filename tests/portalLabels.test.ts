import test from "node:test";
import assert from "node:assert/strict";
import { clientOrder, clientState } from "../src/lib/portalLabels.ts";

test("internal stages become client wording", () => {
  assert.equal(clientState({ type: "pending" }).label, "รอคุณตรวจ");
  assert.equal(clientState({ type: "qc" }).label, "กำลังตัดต่อ");
  assert.equal(clientState({ type: "edit", revisionCount: 1 }).key, "revised");
  assert.equal(clientState({ type: "approved" }).tone, "done");
  assert.ok(clientOrder({ type: "pending" }) < clientOrder({ type: "edit" }));
});
