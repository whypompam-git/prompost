import assert from "node:assert/strict";
import { test } from "node:test";
import { effectivePayments, roundBalance, roundBilled, roundFor, suggestedInvoiceItems, suggestedQuoteItems, type QuoteLite, type Round } from "../src/lib/billing.ts";

const round: Round = { id: "r1", clientId: "c1", packageName: "แพ็ค 15 คลิป", amount: 15000, assignedAt: "2026-10-01T00:00:00Z" };
const older: Round = { id: "r0", clientId: "c1", amount: 9000, assignedAt: "2026-05-01T00:00:00Z" };
const quote = (o: Partial<QuoteLite>): QuoteLite => ({ id: "q", clientId: "c1", clientPackageId: "r1", status: "draft", createdAt: "2026-10-02T00:00:00Z", items: [{ description: "x", qty: 1, unitPrice: 17000 }], vatPercent: 0, whtPercent: 0, ...o });

test("billed = latest non-rejected quotation of the round, else the package price", () => {
  assert.equal(roundBilled(round, []), 15000);
  assert.equal(roundBilled(round, [quote({})]), 17000); // package + extras
  assert.equal(roundBilled(round, [quote({ status: "rejected" })]), 15000);
  assert.equal(roundBilled(round, [quote({ id: "a", createdAt: "2026-10-02T00:00:00Z" }), quote({ id: "b", createdAt: "2026-10-05T00:00:00Z", items: [{ description: "y", qty: 1, unitPrice: 20000 }] })]), 20000);
  assert.equal(roundBilled(round, [quote({ clientPackageId: "other" })]), 15000);
});

test("a 50% deposit booked in the ledger counts at once; the receipt for it is not counted twice", () => {
  const rounds = [round];
  const txNoReceipt = [{ id: "t1", type: "income", clientId: "c1", receiptId: null, amount: 7500, occurredAt: "2026-10-03" }];
  let p = effectivePayments(rounds, [], txNoReceipt);
  assert.deepEqual(roundBalance(round, [], p), { billed: 15000, paid: 7500, outstanding: 7500 });
  // the receipt is issued for that entry → entry now has receiptId; only the receipt counts
  const receipt = { id: "rc", clientId: "c1", clientPackageId: null, amount: 7500, createdAt: "2026-10-03T05:00:00Z" };
  p = effectivePayments(rounds, [receipt], [{ ...txNoReceipt[0], receiptId: "rc" }]);
  assert.equal(roundBalance(round, [], p).paid, 7500);
  assert.equal(roundBalance(round, [], p).outstanding, 7500);
});

test("payments go to the round that was running at the time; expenses and client-less income are ignored", () => {
  const rounds = [older, round];
  assert.equal(roundFor(rounds, "c1", "2026-06-10"), "r0");
  assert.equal(roundFor(rounds, "c1", "2026-10-03"), "r1");
  assert.equal(roundFor(rounds, "c1", "2026-01-01"), "r0"); // before every round → the oldest
  const p = effectivePayments(rounds, [], [
    { id: "a", type: "expense", clientId: "c1", amount: 100, occurredAt: "2026-10-03" },
    { id: "b", type: "income", clientId: null, amount: 100, occurredAt: "2026-10-03" },
    { id: "c", type: "income", clientId: "c1", amount: 4000, occurredAt: "2026-06-10" },
  ]);
  assert.equal(p.length, 1);
  assert.equal(roundBalance(older, [], p).paid, 4000);
  assert.equal(roundBalance(round, [], p).paid, 0);
});

test("suggestions: quotation from the package, invoice for what is left", () => {
  assert.deepEqual(suggestedQuoteItems(round), [{ description: "แพ็ค 15 คลิป", qty: 1, unitPrice: 15000 }]);
  assert.deepEqual(suggestedQuoteItems(undefined), []);
  const inv = suggestedInvoiceItems(round, 7500, 7500);
  assert.equal(inv[0].unitPrice, 7500);
  assert.match(inv[0].description, /คงเหลือ/);
  assert.deepEqual(suggestedInvoiceItems(round, 0, 15000), []);
});

import { alertBilling } from "../src/lib/billing.ts";
test("alert feed: billed amount per round and payments attached to rounds", () => {
  const f = alertBilling([round], [quote({})], [], [{ id: "t", type: "income", clientId: "c1", amount: 8500, occurredAt: "2026-10-03" }]);
  assert.equal(f.rounds[0].amount, 17000);
  assert.deepEqual(f.receipts, [{ clientPackageId: "r1", amount: 8500 }]);
});
