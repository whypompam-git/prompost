import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller } from "@/lib/draftsServer";
import { alertTeamLine } from "@/lib/lineDigest";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DONE_SHOOT = (t: { type: string; status: string }) => (t.type === "shoot" && t.status === "done") || ["edit", "qc", "pending", "approved", "posted"].includes(t.type);

// End of a shoot: a summary of the queue (client, queue, date, how many clips were
// shot and their titles) sent to the team's LINE group, ready to forward to the client.
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });
  const { queueId, send } = await request.json().catch(() => ({}));
  if (!isUuid(queueId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = createAdminClient();
  const { data: q } = await db.from("queues").select("id, name, shoot_date, client_id, clients(name)").eq("id", queueId).maybeSingle();
  if (!q) return NextResponse.json({ error: "ไม่พบคิว" }, { status: 404 });
  const { data: tasks } = await db.from("tasks").select("title, type, status, shoot_order").eq("queue_id", queueId);
  const shot = (tasks ?? []).filter(DONE_SHOOT).sort((a, b) => (a.shoot_order ?? 999) - (b.shoot_order ?? 999) || a.title.localeCompare(b.title, "th", { numeric: true }));
  const notYet = (tasks ?? []).filter((t) => !DONE_SHOOT(t) && t.type === "shoot");
  const client = (Array.isArray(q.clients) ? q.clients[0] : q.clients) as { name: string } | null;
  const date = q.shoot_date ? new Date(`${q.shoot_date}T12:00:00+07:00`).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-";
  const text = [
    `🎬 สรุปการถ่าย ${client?.name ?? ""}`,
    `คิว: ${q.name}`,
    `วันที่: ${date}`,
    `ถ่ายแล้ว ${shot.length} คลิป${notYet.length ? ` (ยังไม่ได้ถ่าย ${notYet.length})` : ""}`,
    "",
    ...shot.map((t, i) => `${i + 1}. ${t.title}`),
  ].join("\n");
  const sent = send === false ? 0 : await alertTeamLine(db, text);
  return NextResponse.json({ ok: true, text, sent });
}
