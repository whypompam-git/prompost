import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { buildDigestText, lineConfigured, pushLine } from "@/lib/lineDigest";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Called daily by Vercel Cron (vercel.json), which sends
// "Authorization: Bearer $CRON_SECRET". ?dry=1 returns the text without sending.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const text = await buildDigestText();
    if (!text) return NextResponse.json({ sent: false, reason: "nothing to report" });
    if (new URL(request.url).searchParams.get("dry") === "1") return NextResponse.json({ sent: false, reason: "dry run", text });
    if (!lineConfigured()) return NextResponse.json({ sent: false, reason: "LINE_CHANNEL_ACCESS_TOKEN / LINE_TO not set", text });
    await pushLine(text);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
