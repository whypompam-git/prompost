import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The client approved and the team put the final file on Drive: save the Drive
// link (the client sees it on their link) and delete the draft videos.
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });
  const { taskId, finalUrl } = await request.json().catch(() => ({}));
  if (!isUuid(taskId) || typeof finalUrl !== "string" || !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}\//i.test(finalUrl.trim()) || finalUrl.length > 1000) {
    return NextResponse.json({ error: "ใส่ลิงก์ Drive ให้ถูกต้อง" }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: task } = await db.from("tasks").select("id, type").eq("id", taskId).maybeSingle();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["approved", "posted"].includes(task.type)) return NextResponse.json({ error: "ลูกค้ายังไม่อนุมัติคลิปนี้" }, { status: 409 });
  const { error } = await db.from("tasks").update({ final_url: finalUrl.trim(), updated_at: new Date().toISOString() }).eq("id", taskId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: drafts } = await db.from("task_drafts").select("id, path").eq("task_id", taskId).is("removed_at", null);
  if (drafts?.length) {
    await db.storage.from("drafts").remove(drafts.map((d) => d.path));
    await db.from("task_drafts").update({ removed_at: new Date().toISOString() }).in("id", drafts.map((d) => d.id));
  }
  return NextResponse.json({ ok: true, removed: drafts?.length ?? 0 });
}
