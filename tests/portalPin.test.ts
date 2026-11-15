import assert from "node:assert/strict";
import { test } from "node:test";
import { portalCookieName, portalPinError } from "../src/lib/portalPinRules.ts";

test("client-link PIN is 4–6 digits", () => {
  assert.equal(portalPinError("1234"), null);
  assert.equal(portalPinError("123456"), null);
  assert.ok(portalPinError("123"));
  assert.ok(portalPinError("1234567"));
  assert.ok(portalPinError("12a4"));
  assert.ok(portalPinError(1234));
});

test("one cookie per client", () => {
  assert.equal(portalCookieName("6f1c2d3e-0000-4000-8000-0000000000aa"), "pp_pin_6f1c2d3e0000400080000000000000aa");
  assert.notEqual(portalCookieName("a"), portalCookieName("b"));
});
