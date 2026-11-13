import assert from "node:assert/strict";
import { test } from "node:test";
import { isClientSlugPath, slugify } from "../src/lib/slug.ts";

test("staff-only routes are never treated as public client links", () => {
  for (const p of ["/dashboard", "/workload", "/mc", "/calendar", "/clients", "/accounting"]) {
    assert.equal(isClientSlugPath(p), false, p);
  }
  assert.equal(isClientSlugPath("/asoramit"), true);
  assert.equal(isClientSlugPath("/asoramit/info"), true);
  assert.equal(slugify("MC"), "mc-co");
});

test("client-link tabs are public paths", () => {
  for (const p of ["/asoramit/review", "/asoramit/plan", "/asoramit/files"]) assert.equal(isClientSlugPath(p), true, p);
  assert.equal(isClientSlugPath("/asoramit/settings"), false);
});
