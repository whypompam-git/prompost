import { NextResponse, type NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { isUuid } from "@/lib/aiApi";
import { caller } from "@/lib/draftsServer";
import { workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

const TOPICS = new Set(["payments", "tasks", "leave", "editor"]);
const CODE_MINUTES = 30;

// Owner: create a LINE channel for this workspace (name, what it receives, team, digest hour)
// — or ask a new code for an existing one — and get a one-time "PP-123456" code to type in
// the group. The webhook attaches the group when the code arrives.
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const db = workspaceDb(c.workspaceId);
  const expires = new Date(Date.now() + CODE_MINUTES * 60_000).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `PP-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    if (isUuid(body.channelId)) {
      const { data, error } = await db.from("line_channels").update({ link_code: code, link_expires_at: expires }).eq("id", body.channelId).select("id");
      if (error?.code === "23505") continue;
      if (error || !data?.length) return NextResponse.json({ error: error?.message ?? "ไม่พบช่องทางนี้" }, { status: 404 });
      return NextResponse.json({ id: body.channelId, code, expiresAt: expires });
    }
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
    const topics = Array.isArray(body.topics) ? body.topics.filter((t: unknown) => typeof t === "string" && TOPICS.has(t)) : [];
    const hour = Number(body.sendHour);
    if (!name) return NextResponse.json({ error: "ตั้งชื่อช่องทาง" }, { status: 400 });
    if (!topics.length) return NextResponse.json({ error: "เลือกอย่างน้อย 1 เรื่องที่จะให้กลุ่มนี้ได้รับ" }, { status: 400 });
    const { data, error } = await db
      .from("line_channels")
      .insert({
        name,
        topics,
        team_id: isUuid(body.teamId) ? body.teamId : null,
        send_hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 8,
        group_id: null,
        enabled: false,
        link_code: code,
        link_expires_at: expires,
      })
      .select("id")
      .single();
    if (error?.code === "23505") continue;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id, code, expiresAt: expires });
  }
  return NextResponse.json({ error: "ลองใหม่อีกครั้ง" }, { status: 500 });
}
