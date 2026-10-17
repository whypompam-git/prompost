import assert from "node:assert/strict";
import { test } from "node:test";
import { expenseByCategory, monthlyTotals, monthsBetween, withholdingRows } from "../src/lib/reports.ts";

test("monthsBetween crosses year boundaries inclusively", () => {
  assert.deepEqual(monthsBetween("2026-11", "2027-02"), ["2026-11", "2026-12", "2027-01", "2027-02"]);
  assert.deepEqual(monthsBetween("2026-10", "2026-10"), ["2026-10"]);
});

const tx = (type: "income" | "expense", amount: number, occurredAt: string, category = "x") =>
  ({ id: occurredAt + amount, type, amount, occurredAt, category }) as never;

test("monthly totals and profit", () => {
  const rows = monthlyTotals([tx("income", 1000, "2026-10-05"), tx("expense", 300, "2026-10-20"), tx("income", 50, "2026-09-01"), tx("income", 9, "2025-01-01")], ["2026-09", "2026-10"]);
  assert.deepEqual(rows, [
    { month: "2026-09", income: 50, expense: 0, profit: 50 },
    { month: "2026-10", income: 1000, expense: 300, profit: 700 },
  ]);
});

test("expense by category: range-limited, largest first, income ignored", () => {
  const rows = expenseByCategory(
    [tx("expense", 100, "2026-10-01", "a"), tx("expense", 500, "2026-10-02", "b"), tx("expense", 50, "2026-10-03", "a"), tx("income", 999, "2026-10-03", "a"), tx("expense", 7, "2026-05-01", "a")],
    "2026-10",
    "2026-10",
  );
  assert.deepEqual(rows, [{ category: "b", amount: 500 }, { category: "a", amount: 150 }]);
});

test("withholding: invoices with a % plus accepted quotations, within range", () => {
  const item = [{ description: "x", qty: 1, unitPrice: 10000 }];
  const inv = [
    { invoiceNo: "IV1", clientId: "c", items: item, vatPercent: 7, whtPercent: 3, createdAt: "2026-10-05T00:00:00Z" },
    { invoiceNo: "IV2", clientId: "c", items: item, vatPercent: 0, whtPercent: 0, createdAt: "2026-10-06T00:00:00Z" },
  ] as never;
  const quo = [
    { quoteNo: "QT1", clientId: "c", items: item, vatPercent: 0, whtPercent: 3, status: "accepted", createdAt: "2026-10-07T00:00:00Z" },
    { quoteNo: "QT2", clientId: "c", items: item, vatPercent: 0, whtPercent: 3, status: "sent", createdAt: "2026-10-07T00:00:00Z" },
  ] as never;
  const rows = withholdingRows(inv, quo, "2026-10", "2026-10");
  assert.deepEqual(rows.map((r) => [r.no, r.wht]), [["IV1", 300], ["QT1", 300]]);
});
