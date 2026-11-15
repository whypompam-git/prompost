import assert from "node:assert/strict";
import { test } from "node:test";
import { afterFailure, lockedMinutesLeft, normalizeUsername, passwordError, usernameError } from "../src/lib/accountRules.ts";

test("usernames: trimmed, lower-cased, Thai/English/digits/._- only", () => {
  assert.equal(normalizeUsername("  Mew.Edit "), "mew.edit");
  assert.equal(normalizeUsername(42), "");
  assert.equal(usernameError("mew"), null);
  assert.equal(usernameError("มิว"), null);
  assert.equal(usernameError("ton_2"), null);
  assert.ok(usernameError("a"));
  assert.ok(usernameError("has space"));
  assert.ok(usernameError("semi;colon"));
  assert.ok(usernameError("x".repeat(31)));
});

test("new passwords need 6+ characters", () => {
  assert.ok(passwordError("1234"));
  assert.ok(passwordError(undefined));
  assert.equal(passwordError("123456"), null);
  assert.ok(passwordError("x".repeat(73)));
});

test("five wrong tries lock the account for a few minutes", () => {
  const now = new Date("2026-11-16T10:00:00Z");
  assert.deepEqual(afterFailure(0, now), { failed_attempts: 1, locked_until: null });
  const locked = afterFailure(4, now);
  assert.equal(locked.failed_attempts, 0);
  assert.equal(lockedMinutesLeft(locked.locked_until, now), 5);
  assert.equal(lockedMinutesLeft(locked.locked_until, new Date("2026-11-16T10:06:00Z")), 0);
  assert.equal(lockedMinutesLeft(null, now), 0);
});
