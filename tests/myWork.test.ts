import assert from "node:assert/strict";
import { test } from "node:test";
import { bucketOf } from "../src/lib/myWorkTypes.ts";

test("clips are bucketed by what the editor has to do next", () => {
  assert.equal(bucketOf({ type: "edit", revisionCount: 0 }), "todo");
  assert.equal(bucketOf({ type: "edit", revisionCount: 2 }), "revise");
  assert.equal(bucketOf({ type: "qc", revisionCount: 1 }), "review");
  assert.equal(bucketOf({ type: "pending", revisionCount: 0 }), "review");
  assert.equal(bucketOf({ type: "approved", revisionCount: 0 }), "done");
  assert.equal(bucketOf({ type: "posted", revisionCount: 3 }), "done");
});
