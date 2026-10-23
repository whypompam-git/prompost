import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { bangkokDay, bangkokHour, channelDue } from "@/lib/alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDigestText, lineTokenSet, pushLine } from "@/lib/lineDigest";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Called by Vercel Cron daily (vercel.json) and hourly by the "LINE digest
// hourly" GitHub workflow, both with "Authorization: Bearer $CRON_SECRET".
// Sends every enabled line_channels row that is due this Bangkok hour; with no
// channels configured it falls back to the single LINE_TO group.
// ?dry=1 returns the texts without sending.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const dry = new URL(request.url).searchParams.get("dry") === "1";
    const now = new Date();
    const db = createAdminClient();
    const cols = "id, name, group_id, send_hour, topics, team_id, enabled, last_sent_on";
    let { data: channels, error: chErr } = await db.from("line_channels").select(cols);
    // No channels yet: turn the old single-group setup (LINE_TO) into a real channel
    // at 08:00 so it is sent once a day and its time can be changed in Settings.
    // (Without this, every hourly poke would send another copy.)
    if (!chErr && (channels ?? []).length === 0 && process.env.LINE_TO && !dry) {
      const { data: same } = await db.from("line_channels").select("id").eq("group_id", process.env.LINE_TO).limit(1);
      if (!same?.length) await db.from("line_channels").insert({ name: "กลุ่มทีม (ตั้งต้น)", group_id: process.env.LINE_TO, send_hour: 8 });
      ({ data: channels, error: chErr } = await db.from("line_channels").select(cols));
    }
    // never fall back to "send everything" when the channel table can't be read —
    // that is how repeated copies went out
    if (chErr) return NextResponse.json({ error: `line_channels: ${chErr.message}` }, { status: 500 });
    if (channels && channels.length > 0) {
      if (!lineTokenSet()) return NextResponse.json({ sent: false, reason: "LINE_CHANNEL_ACCESS_TOKEN not set" });
      const today = bangkokDay(now);
      const hour = bangkokHour(now);
      const results: { channel: string; sent: boolean; reason?: string; text?: string | null }[] = [];
      for (const c of channels.filter((c) => channelDue(c, hour, today))) {
        try {
          const text = await buildDigestText(now, { topics: c.topics, teamId: c.team_id });
          if (!text) {
            results.push({ channel: c.name, sent: false, reason: "nothing to report" });
          } else if (dry) {
            results.push({ channel: c.name, sent: false, reason: "dry run", text });
          } else {
            await pushLine(text, c.group_id);
            results.push({ channel: c.name, sent: true });
          }
          if (!dry) await db.from("line_channels").update({ last_sent_on: today }).eq("id", c.id);
        } catch (err) {
          console.error(c.name, err);
          results.push({ channel: c.name, sent: false, reason: err instanceof Error ? err.message : "failed" });
        }
      }
      return NextResponse.json({ channels: results });
    }

    // nothing to send to — channels are the only way messages go out now
    return NextResponse.json({ sent: false, reason: "no line channels", linedTo: Boolean(process.env.LINE_TO), dry });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
