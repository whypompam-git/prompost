import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { bangkokDay, bangkokHour, channelDue } from "@/lib/alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDigestText, lineTokenSet, pushLine } from "@/lib/lineDigest";
import { PROMPOST_WORKSPACE_ID, workspaceDb, type WorkspaceDb } from "@/lib/supabase/workspaceDb";
import { expiryReminders } from "@/lib/contractRenewal";
import { CONTRACT_COLUMNS, fromContractRow } from "@/lib/supabase/queries";
import type { SupabaseClient } from "@supabase/supabase-js";

// Contracts nearing their end → the owner's bell (never the team LINE groups:
// staff contracts are owner-only). One notification per contract per stage.
// Draft videos of clips that were deleted: the database rows go with the clip,
// the files in storage don't — remove them. Files are stored as <client>/<task>/<file>;
// only folders whose clip no longer exists are touched.
async function removeOrphanDrafts(db: SupabaseClient): Promise<number> {
  const { data: clientDirs } = await db.storage.from("drafts").list("", { limit: 1000 });
  let removed = 0;
  for (const c of clientDirs ?? []) {
    const { data: taskDirs } = await db.storage.from("drafts").list(c.name, { limit: 1000 });
    const ids = (taskDirs ?? []).map((t) => t.name).filter((n) => /^[0-9a-f-]{36}$/i.test(n));
    if (!ids.length) continue;
    const { data: alive, error } = await db.from("tasks").select("id").in("id", ids);
    if (error) continue; // never delete on a failed lookup
    const keep = new Set((alive ?? []).map((t) => t.id as string));
    for (const t of ids.filter((id) => !keep.has(id))) {
      const { data: files } = await db.storage.from("drafts").list(`${c.name}/${t}`, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${c.name}/${t}/${f.name}`);
      if (paths.length) {
        await db.storage.from("drafts").remove(paths);
        removed += paths.length;
      }
    }
  }
  return removed;
}

async function remindContractExpiry(db: WorkspaceDb, today: string): Promise<number> {
  const { data: rows, error } = await db.from("contracts").select(CONTRACT_COLUMNS).eq("status", "signed").not("end_date", "is", null);
  if (error || !rows?.length) return 0;
  const contracts = rows.map(fromContractRow);
  const renewed = new Set(contracts.map((c) => c.renewedFrom).filter((x): x is string => !!x));
  const due = expiryReminders(contracts, renewed, today);
  if (!due.length) return 0;
  const { data: owners } = await db.from("staff").select("id").eq("role", "owner").eq("is_active", true);
  let made = 0;
  for (const d of due) {
    for (const o of owners ?? []) {
      const { data: seen } = await db.from("notifications").select("id").eq("recipient_id", o.id).eq("kind", "contract_expiry").eq("title", d.title).limit(1);
      if (seen?.length) continue;
      await db.from("notifications").insert({ recipient_id: o.id, kind: "contract_expiry", client_id: d.clientId ?? null, title: d.title });
      made++;
    }
  }
  return made;
}

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
    const admin = createAdminClient();
    // once a day (03:00 Bangkok): clear draft files left behind by deleted clips (all workspaces share the bucket)
    if (!dry && bangkokHour(now) === 3) await removeOrphanDrafts(admin).catch((err) => console.error("orphan drafts", err));

    const { data: workspaces, error: wsErr } = await admin.from("workspaces").select("id, handle, line_enabled");
    if (wsErr) return NextResponse.json({ error: `workspaces: ${wsErr.message}` }, { status: 500 });
    const results: { workspace: string; channel: string; sent: boolean; reason?: string; text?: string | null }[] = [];
    for (const ws of workspaces ?? []) {
      const db = workspaceDb(ws.id);
      if (!dry) await remindContractExpiry(db, bangkokDay(now)).catch((err) => console.error("contract reminders", ws.handle, err));
      if (!ws.line_enabled) continue; // LINE is switched on per workspace by the platform owner
      const cols = "id, name, group_id, send_hour, topics, team_id, enabled, last_sent_on";
      let { data: channels, error: chErr } = await db.from("line_channels").select(cols);
      // PromPost's old single-group setup (LINE_TO) becomes a real channel at 08:00
      if (ws.id === PROMPOST_WORKSPACE_ID && !chErr && (channels ?? []).length === 0 && process.env.LINE_TO && !dry) {
        const { data: same } = await db.from("line_channels").select("id").eq("group_id", process.env.LINE_TO).limit(1);
        if (!same?.length) await db.from("line_channels").insert({ name: "กลุ่มทีม (ตั้งต้น)", group_id: process.env.LINE_TO, send_hour: 8 });
        ({ data: channels, error: chErr } = await db.from("line_channels").select(cols));
      }
      // never fall back to "send everything" when the channel table can't be read
      if (chErr) {
        results.push({ workspace: ws.handle, channel: "-", sent: false, reason: `line_channels: ${chErr.message}` });
        continue;
      }
      if (!channels?.length) continue;
      if (!lineTokenSet()) return NextResponse.json({ sent: false, reason: "LINE_CHANNEL_ACCESS_TOKEN not set" });
      const today = bangkokDay(now);
      const hour = bangkokHour(now);
      for (const c of channels.filter((c: { send_hour: number; enabled: boolean; last_sent_on: string | null }) => channelDue(c, hour, today))) {
        try {
          const text = await buildDigestText(ws.id, now, { topics: c.topics, teamId: c.team_id });
          if (!text) results.push({ workspace: ws.handle, channel: c.name, sent: false, reason: "nothing to report" });
          else if (dry) results.push({ workspace: ws.handle, channel: c.name, sent: false, reason: "dry run", text });
          else {
            await pushLine(text, c.group_id);
            results.push({ workspace: ws.handle, channel: c.name, sent: true });
          }
          if (!dry) await db.from("line_channels").update({ last_sent_on: today }).eq("id", c.id);
        } catch (err) {
          console.error(ws.handle, c.name, err);
          results.push({ workspace: ws.handle, channel: c.name, sent: false, reason: err instanceof Error ? err.message : "failed" });
        }
      }
    }
    return NextResponse.json({ channels: results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
