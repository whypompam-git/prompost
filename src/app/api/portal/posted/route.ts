import { NextResponse } from "next/server";
import { portalGate } from "@/lib/portalPin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";

// The client says "I posted this clip": an approved clip moves to Post (the green tick in the feed).
// Same checks as the post-date route: active link, the client's PIN, only that client's approved clips.
export async function POST(request: Request) {
  const { clientKey, taskId } = await request.json().catch(() => ({}));
  if (typeof clientKey !== "string" || !isUuid(taskId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("id, portal_enabled, workspace_id").eq(isUuid(clientKey) ? "portal_token" : "slug", clientKey).maybeSingle();
  if (!client || !client.portal_enabled) return NextResponse.json({ error: "link inactive" }, { status: 403 });
  if ((await portalGate(client)) !== "open") return NextResponse.json({ error: "ต้องใส่ PIN ก่อน" }, { status: 401 });
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); // Bangkok date
  const { data: task } = await db.from("tasks").select("id, type, post_date").eq("id", taskId).eq("client_id", client.id).in("type", ["approved", "posted"]).maybeSingle();
  if (!task) return NextResponse.json({ error: "คลิปนี้ยังไม่อนุมัติ หรือไม่พบ" }, { status: 409 });
  const { error } = await db
    .from("tasks")
    .update({ type: "posted", status: "done", post_by: "client", post_date: task.post_date ?? today, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("client_id", client.id);
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
