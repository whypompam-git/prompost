import test from "node:test";
import assert from "node:assert/strict";
import { checkCart, crc16, newOrderCode, normalizePhone, promptPayPayload, validPhone, type ShopProduct } from "../src/lib/shop.ts";

const P = (o: Partial<ShopProduct>): ShopProduct => ({ id: "a", name: "ใบปลิว", description: "", price: 20, stock: 5, maxPerPerson: 2, imageUrl: null, active: true, sortOrder: 0, ...o });

test("checkCart totals a valid cart", () => {
  const r = checkCart([P({}), P({ id: "b", name: "สติกเกอร์", price: 10 })], [{ id: "a", qty: 2 }, { id: "b", qty: 1 }]);
  assert.equal(r.ok, true);
  assert.equal(r.total, 50);
});

test("checkCart flags sold out, over the limit, and gone products", () => {
  const products = [P({ stock: 1 }), P({ id: "b", maxPerPerson: 2 }), P({ id: "c", active: false })];
  const r = checkCart(products, [{ id: "a", qty: 2 }, { id: "b", qty: 2 }, { id: "c", qty: 1 }, { id: "zzz", qty: 1 }], { b: 1 });
  assert.deepEqual(r.problems.map((p) => [p.id, p.reason, p.available]), [["a", "stock", 1], ["b", "limit", 1], ["c", "gone", 0], ["zzz", "gone", 0]]);
  assert.equal(r.ok, false);
});

test("an empty cart is not ok", () => {
  assert.equal(checkCart([P({})], []).ok, false);
});

test("phone helpers", () => {
  assert.equal(normalizePhone("081-234 5678"), "0812345678");
  assert.equal(validPhone("0812345678"), true);
  assert.equal(validPhone("12345"), false);
});

test("order code shape", () => {
  assert.match(newOrderCode(), /^G-[A-HJ-NP-Z2-9]{8}$/);
});

test("promptpay payload is well formed with a valid CRC", () => {
  assert.equal(crc16("123456789"), "29B1"); // CRC-16/CCITT-FALSE check value
  const p = promptPayPayload("0812345678", 20)!;
  assert.match(p, /^000201010212/);
  assert.ok(p.includes("0016A000000677010111011300668123456785802TH") || p.includes("A000000677010111011300668123456"));
  assert.ok(p.includes("540520.00"));
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)));
  assert.equal(promptPayPayload("0812345678")!.startsWith("000201010211"), true);
  assert.equal(promptPayPayload("123"), null);
});
