import assert from "node:assert/strict";
import { test } from "node:test";
import { handleError, normalizeHandle, workspaceNameError } from "../src/lib/workspaceRules.ts";

test("workspace IDs: lowercase letters, digits and inner dashes", () => {
  assert.equal(normalizeHandle("  My-Agency "), "my-agency");
  assert.equal(handleError("my-agency"), null);
  assert.equal(handleError("agency2"), null);
  assert.ok(handleError("ab"));
  assert.ok(handleError("-agency"));
  assert.ok(handleError("agency-"));
  assert.ok(handleError("my--agency"));
  assert.ok(handleError("my agency"));
  assert.ok(handleError("เอเจนซี่"));
  assert.ok(handleError("admin"));
  assert.ok(handleError("x".repeat(31)));
});

test("workspace names", () => {
  assert.equal(workspaceNameError("พร้อมโพส"), null);
  assert.ok(workspaceNameError(" "));
  assert.ok(workspaceNameError(undefined));
});
