import test from "node:test";
import assert from "node:assert/strict";
import { expiryReminders, renewalValues } from "../src/lib/contractRenewal.ts";
import type { Contract } from "../src/lib/types.ts";

const base: Contract = {
  id: "c1", contractNo: "CT-1", kind: "client", clientId: "k1", terms: {}, status: "signed", title: "t", signDate: "2026-08-01",
  startDate: "2026-08-01", endDate: "2026-10-31", termMonths: 3, paymentMode: "monthly", totalAmount: 30000,
  installments: [], parties: { seller: { name: "s", address: "", taxId: "", phone: "" }, client: { name: "ร้าน A", address: "", taxId: "", phone: "" } },
  intro: "", clauses: [], closing: "", shareToken: "x", createdAt: "2026-08-01",
};

test("renewal starts the day after and keeps the term", () => {
  const v = renewalValues({ ...base, endDate: "2026-11-30" }, "2026-11-06");
  assert.equal(v.startDate, "2026-12-01");
  assert.equal(v.endDate, "2027-02-28");
  assert.equal(v.installments.length, 3);
  assert.equal(v.renewedFrom, "c1");
  // already ended → starts today
  assert.equal(renewalValues(base, "2026-11-06").startDate, "2026-11-06");
});

test("expiry reminders at 30/7/0 days, skipped once renewed", () => {
  const r = expiryReminders([{ ...base, endDate: "2026-11-20" }], new Set(), "2026-11-06");
  assert.equal(r.length, 1);
  assert.ok(r[0].title.includes("30"));
  assert.equal(expiryReminders([{ ...base, endDate: "2026-11-20" }], new Set(["c1"]), "2026-11-06").length, 0);
  assert.equal(expiryReminders([{ ...base, endDate: "2027-01-20" }], new Set(), "2026-11-06").length, 0);
});
