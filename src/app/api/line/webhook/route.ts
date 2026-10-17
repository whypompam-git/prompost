import { NextResponse } from "next/server";
import { repliesFor, verifyLineSignature } from "@/lib/lineWebhook";

export const dynamic = "force-dynamic";

// LINE Messaging API webhook. Its only job is setup: when someone types "id" /
// "ไอดี" in the group (or the bot is added to it) the bot replies with that
// chat's ID, which goes into LINE_TO. Requests must carry a valid LINE
// signature, so nobody else can drive it.
export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return NextResponse.json({ error: "LINE_CHANNEL_SECRET is not set" }, { status: 503 });

  const raw = await request.text();
  if (!verifyLineSignature(raw, request.headers.get("x-line-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: { events?: unknown[] } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (token) {
    for (const r of repliesFor((body.events ?? []) as Parameters<typeof repliesFor>[0])) {
      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ replyToken: r.replyToken, messages: [{ type: "text", text: r.text }] }),
      }).catch((err) => console.error("LINE reply failed", err));
    }
  }
  // LINE's "Verify" button posts an empty events list and expects 200
  return NextResponse.json({ ok: true });
}
