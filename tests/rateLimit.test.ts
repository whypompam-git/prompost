import assert from "node:assert/strict";
import { test } from "node:test";
import { FORM_MIN_AGE_MS, clientIp, formAgeError } from "../src/lib/rateLimitRules.ts";

test("a form sent instantly or after hours is refused", () => {
  const t = 1_000_000;
  assert.ok(formAgeError(t, t + 500));
  assert.equal(formAgeError(t, t + FORM_MIN_AGE_MS + 1), null);
  assert.ok(formAgeError(t, t + 3 * 3600_000));
  assert.ok(formAgeError(t + 10, t)); // from the future
  assert.ok(formAgeError(Number.NaN, t));
});

test("visitor IP is the first forwarded address", () => {
  const h = (m: Record<string, string>) => ({ get: (n: string) => m[n] ?? null });
  assert.equal(clientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIp(h({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(clientIp(h({})), "unknown");
});
