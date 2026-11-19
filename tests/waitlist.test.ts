import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, validEmail, validPhone } from "../src/lib/waitlist.ts";

test("phone numbers are cleaned and checked", () => {
  assert.equal(normalizePhone("081-234 5678"), "0812345678");
  assert.equal(normalizePhone("+66812345678"), "0812345678");
  assert.ok(validPhone("0812345678"));
  assert.ok(!validPhone("12345"));
});

test("email is optional but must look right", () => {
  assert.ok(validEmail(""));
  assert.ok(validEmail("a@b.co"));
  assert.ok(!validEmail("nope"));
});
