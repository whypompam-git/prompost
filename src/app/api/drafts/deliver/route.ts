import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller, signedDraftUrl, taskForCaller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The editor's download link for the approved draft (to put on Drive). An
// own-only editor gets it only for their own clips.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!isUuid(taskId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const task = await taskForCaller(c, taskId!);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = createAdminClient();
  const [{ data: d }, { data: cl }] = await Promise.all([
    db.from("task_drafts").select("path, version").eq("task_id", task.id).is("removed_at", null).order("version", { ascending: false }).limit(1).maybeSingle(),
    db.from("clients").select("name").eq("id", task.client_id).maybeSingle(),
  ]);
  if (!d) return NextResponse.json({ downloadUrl: null });
  const ext = d.path.slice(d.path.lastIndexOf("."));
  const name = `${cl?.name ?? ""} ${task.title} v${d.version}${ext}`.replace(/[\\/:*?"<>|]/g, " ");
  return NextResponse.json({ downloadUrl: (await signedDraftUrl(d.path, name)) ?? null });
}

// The client approved and the editor put the final file on Drive: save the Drive
// link (the client sees it on their link) and delete the draft videos.
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  const { taskId, finalUrl } = await request.json().catch(() => ({}));
  if (!isUuid(taskId) || typeof finalUrl !== "string" || !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}\//i.test(finalUrl.trim()) || finalUrl.length > 1000) {
    return NextResponse.json({ error: "ใส่ลิงก์ Drive ให้ถูกต้อง" }, { status: 400 });
  }
  // team members may deliver any clip; an own-only editor only their own
  const task = await taskForCaller(c, taskId);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["approved", "posted"].includes(task.type)) return NextResponse.json({ error: "ลูกค้ายังไม่อนุมัติคลิปนี้" }, { status: 409 });
  const db = createAdminClient();
  const { error } = await db.from("tasks").update({ final_url: finalUrl.trim(), updated_at: new Date().toISOString() }).eq("id", taskId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: drafts } = await db.from("task_drafts").select("id, path").eq("task_id", taskId).is("removed_at", null);
  if (drafts?.length) {
    await db.storage.from("drafts").remove(drafts.map((d) => d.path));
    await db.from("task_drafts").update({ removed_at: new Date().toISOString() }).in("id", drafts.map((d) => d.id));
  }
  return NextResponse.json({ ok: true, removed: drafts?.length ?? 0 });
}
