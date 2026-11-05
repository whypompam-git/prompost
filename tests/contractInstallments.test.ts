import test from "node:test";
import assert from "node:assert/strict";
import { addMonths, depositInstallments, monthlyInstallments, termEndDate } from "../src/lib/contractInstallments.ts";

test("addMonths clamps to month end", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-11-15", 3), "2027-02-15");
});

test("term end = day before N months later", () => {
  assert.equal(termEndDate("2026-11-01", 3), "2027-01-31");
  assert.equal(termEndDate("2026-01-31", 1), "2026-02-27");
  assert.equal(termEndDate("2026-11-06", 12), "2027-11-05");
});

test("monthly installments sum exactly", () => {
  const r = monthlyInstallments(10000, 3, "2026-11-01");
  assert.equal(r.length, 3);
  assert.equal(Math.round(r.reduce((s, i) => s + i.amount, 0) * 100), 1000000);
  assert.deepEqual(r.map((i) => i.due), ["2026-11-01", "2026-12-01", "2027-01-01"]);
  const d = depositInstallments(9999, 50, "2027-01-01");
  assert.equal(d[0].amount + d[1].amount, 9999);
});
