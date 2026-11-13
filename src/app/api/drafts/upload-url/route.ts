import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller, taskForCaller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EXT = new Set(["mp4", "mov", "m4v", "webm"]);

// A one-shot signed upload URL for a clip's draft video — the browser uploads
// straight to storage (big files never pass through the server).
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  const { taskId, ext } = await request.json().catch(() => ({}));
  if (!isUuid(taskId) || typeof ext !== "string" || !EXT.has(ext.toLowerCase())) return NextResponse.json({ error: "ไฟล์ต้องเป็น mp4 / mov / m4v / webm" }, { status: 400 });
  const task = await taskForCaller(c, taskId);
  if (!task) return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
  if (!["edit", "qc"].includes(task.type)) return NextResponse.json({ error: "อัปโหลดดราฟได้เฉพาะงานที่อยู่ขั้นตัดต่อหรือ QC" }, { status: 409 });
  const path = `${task.client_id}/${task.id}/${Date.now()}.${ext.toLowerCase()}`;
  const { data, error } = await createAdminClient().storage.from("drafts").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "failed" }, { status: 500 });
  return NextResponse.json({ path: data.path, token: data.token });
}
