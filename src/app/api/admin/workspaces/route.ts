import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROMPOST_WORKSPACE_ID, workspaceDb } from "@/lib/supabase/workspaceDb";
import { requirePlatformAdmin } from "@/lib/auth/platformAdmin";

export const dynamic = "force-dynamic";

// Switch AI / LINE / joining for a workspace.
export async function PATCH(request: NextRequest) {
  const me = await requirePlatformAdmin(request);
  if (me instanceof NextResponse) return me;
  const body = await request.json().catch(() => ({}));
  if (!isUuid(body.id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const patch: Record<string, boolean> = {};
  if (typeof body.aiEnabled === "boolean") patch.ai_enabled = body.aiEnabled;
  if (typeof body.lineEnabled === "boolean") patch.line_enabled = body.lineEnabled;
  if (typeof body.joinOpen === "boolean") patch.join_open = body.joinOpen;
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });
  const { error } = await createAdminClient().from("workspaces").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Delete a workspace and everything in it (type its Workspace ID to confirm). Never PromPost,
// never one with signed contracts (those are legal records the database refuses to delete).
export async function DELETE(request: NextRequest) {
  const me = await requirePlatformAdmin(request);
  if (me instanceof NextResponse) return me;
  const { id, confirm } = await request.json().catch(() => ({}));
  if (!isUuid(id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  if (id === PROMPOST_WORKSPACE_ID) return NextResponse.json({ error: "ลบ Workspace พร้อมโพสไม่ได้" }, { status: 400 });
  const admin = createAdminClient();
  const { data: ws } = await admin.from("workspaces").select("handle").eq("id", id).maybeSingle();
  if (!ws) return NextResponse.json({ error: "ไม่พบ Workspace" }, { status: 404 });
  if (confirm !== ws.handle) return NextResponse.json({ error: "พิมพ์ Workspace ID ให้ตรงเพื่อยืนยัน" }, { status: 400 });

  const db = workspaceDb(id);
  const { count: signed } = await db.from("contracts").select("id", { count: "exact", head: true }).eq("status", "signed");
  if (signed) return NextResponse.json({ error: `มีสัญญาที่เซ็นแล้ว ${signed} ฉบับ ลบไม่ได้` }, { status: 409 });
  // contracts hold their children with "restrict": clear them first, then the workspace cascades
  for (const t of ["contract_signer_info", "contract_payments", "contracts"]) {
    const { error } = await db.from(t).delete();
    if (error) return NextResponse.json({ error: `${t}: ${error.message}` }, { status: 500 });
  }
  const { error } = await admin.from("workspaces").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
