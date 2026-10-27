import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { requireMe } from "@/lib/myWork";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The editor attaches (or clears) the Drive link of the finished video — the
// only field of a clip they can change, and only on their own clips that are
// still in editing or QC.
export async function POST(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const { taskId, finalUrl } = await request.json().catch(() => ({}));
  if (!isUuid(taskId) || (finalUrl !== null && (typeof finalUrl !== "string" || finalUrl.length > 1000))) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const url = typeof finalUrl === "string" && finalUrl.trim() ? finalUrl.trim() : null;
  const { data, error } = await createAdminClient()
    .from("tasks")
    .update({ final_url: url, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("editor_id", me.staffId)
    .in("type", ["edit", "qc"])
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "แก้ไม่ได้ — งานนี้ไม่ใช่ของคุณหรือผ่านขั้นตรวจไปแล้ว" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
