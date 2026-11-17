import { NextResponse } from "next/server";
import { portalGate } from "@/lib/portalPin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";

// The client picks the day they will post an approved clip (or clears it) from their link.
// Needs an active link + the client's PIN; only that client's approved/posted clips.
export async function POST(request: Request) {
  const { clientKey, taskId, postDate } = await request.json().catch(() => ({}));
  const validDate = postDate === null || (typeof postDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(postDate) && !Number.isNaN(Date.parse(postDate)));
  if (typeof clientKey !== "string" || !isUuid(taskId) || !validDate) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id, portal_enabled, workspace_id")
    .eq(isUuid(clientKey) ? "portal_token" : "slug", clientKey)
    .maybeSingle();
  if (!client || !client.portal_enabled) return NextResponse.json({ error: "link inactive" }, { status: 403 });
  if ((await portalGate(client)) !== "open") return NextResponse.json({ error: "ต้องใส่ PIN ก่อน" }, { status: 401 });

  const { data, error } = await db
    .from("tasks")
    .update({ post_date: postDate, post_by: "client", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("client_id", client.id)
    .in("type", ["approved", "posted"])
    .select("id");
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "คลิปนี้ยังไม่อนุมัติ หรือไม่พบ" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
