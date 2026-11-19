import test from "node:test";
import assert from "node:assert/strict";
import { clientReasons, countReview, reasonText } from "../src/lib/reviewBadge.ts";

const it = (id: string, clientId: string, editorId: string | null, assigneeId: string | null) => ({ id, clientId, editorId, assigneeId });

test("mine counts clips where I am the editor or the responsible person", () => {
  const items = [it("1", "a", "me", null), it("2", "a", "x", "me"), it("3", "b", "x", "y")];
  assert.equal(countReview(items, "mine", "me"), 2);
  assert.equal(countReview(items, "all", "me"), 3);
});

test("client dot says why", () => {
  const m = clientReasons({ review: [it("1", "a", null, null), it("2", "a", null, null)], deliver: [it("3", "a", null, null)], revise: [it("4", "b", null, null)] });
  assert.equal(reasonText(m.get("a")!), "รอตรวจ 2 · รอส่ง Drive 1");
  assert.equal(reasonText(m.get("b")!), "ต้องแก้ 1");
});
