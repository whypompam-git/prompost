import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { chatIdOf, repliesFor, verifyLineSignature } from "../src/lib/lineWebhook.ts";

test("signature: valid passes, anything else fails", () => {
  const body = '{"events":[]}';
  const sig = createHmac("sha256", "secret").update(body).digest("base64");
  assert.equal(verifyLineSignature(body, sig, "secret"), true);
  assert.equal(verifyLineSignature(body + " ", sig, "secret"), false);
  assert.equal(verifyLineSignature(body, sig, "other"), false);
  assert.equal(verifyLineSignature(body, null, "secret"), false);
  assert.equal(verifyLineSignature(body, "", "secret"), false);
  assert.equal(verifyLineSignature(body, sig, ""), false);
});

test("chat id prefers group, then room, then user", () => {
  assert.equal(chatIdOf({ groupId: "C1", userId: "U1" }), "C1");
  assert.equal(chatIdOf({ roomId: "R1", userId: "U1" }), "R1");
  assert.equal(chatIdOf({ userId: "U1" }), "U1");
  assert.equal(chatIdOf({}), null);
});

test("replies only to 'id' requests and to the bot joining", () => {
  const asks = ["id", "ID", " ไอดี ", "group id", "groupid", "ไอดีกลุ่ม"];
  for (const text of asks) {
    const r = repliesFor([{ type: "message", replyToken: "t", source: { type: "group", groupId: "Cabc" }, message: { type: "text", text } }]);
    assert.equal(r.length, 1, text);
    assert.match(r[0].text, /Cabc/);
    assert.match(r[0].text, /กลุ่มนี้/);
  }
  assert.equal(repliesFor([{ type: "join", replyToken: "t", source: { type: "group", groupId: "Cx" } }]).length, 1);
  // ordinary chatter, other event types, missing tokens/ids are ignored
  assert.equal(repliesFor([{ type: "message", replyToken: "t", source: { groupId: "C" }, message: { type: "text", text: "สวัสดี id ของฉันคือ" } }]).length, 0);
  assert.equal(repliesFor([{ type: "message", replyToken: "t", source: { groupId: "C" }, message: { type: "image" } }]).length, 0);
  assert.equal(repliesFor([{ type: "follow", replyToken: "t", source: { userId: "U" } }]).length, 0);
  assert.equal(repliesFor([{ type: "message", source: { groupId: "C" }, message: { type: "text", text: "id" } }]).length, 0);
  assert.equal(repliesFor([{ type: "message", replyToken: "t", message: { type: "text", text: "id" } }]).length, 0);
});
