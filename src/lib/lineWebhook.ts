import { createHmac, timingSafeEqual } from "node:crypto";

// LINE signs every webhook body with the channel secret (HMAC-SHA256, base64).
export function verifyLineSignature(rawBody: string, signature: string | null, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string; groupId?: string; roomId?: string };
  message?: { type?: string; text?: string };
};

const ASK = /^\s*(id|ไอดี|group\s*id|groupid|ขอไอดี|ไอดีกลุ่ม)\s*$/i;

// The ID to put in LINE_TO for this chat (group > room > user).
export function chatIdOf(source: LineEvent["source"]): string | null {
  return source?.groupId ?? source?.roomId ?? source?.userId ?? null;
}

// For each event that should be answered: someone typed "id" / "ไอดี" in the
// chat, or the bot was just added to a group/room. Everything else is ignored.
export function repliesFor(events: LineEvent[]): { replyToken: string; text: string }[] {
  const out: { replyToken: string; text: string }[] = [];
  for (const e of events) {
    if (!e.replyToken) continue;
    const id = chatIdOf(e.source);
    if (!id) continue;
    const asked = e.type === "message" && e.message?.type === "text" && ASK.test(e.message.text ?? "");
    const joined = e.type === "join";
    if (!asked && !joined) continue;
    const where = e.source?.groupId ? "กลุ่มนี้" : e.source?.roomId ? "ห้องนี้" : "แชทนี้";
    out.push({ replyToken: e.replyToken, text: `ID ของ${where}\n${id}\n\n(นำไปตั้งเป็น LINE_TO ใน Vercel เพื่อให้บอทส่งสรุปเข้า${where})` });
  }
  return out;
}
