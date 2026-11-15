import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/auth/platformAdmin";

export const dynamic = "force-dynamic";

// Delete a login (e.g. a test account). Its staff rows stay as history (no login attached).
// Not yourself, not another platform admin, not someone who still owns a workspace.
export async function DELETE(request: NextRequest) {
  const me = await requirePlatformAdmin(request);
  if (me instanceof NextResponse) return me;
  const { id } = await request.json().catch(() => ({}));
  if (!isUuid(id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  if (id === me) return NextResponse.json({ error: "ลบบัญชีตัวเองไม่ได้" }, { status: 400 });
  const db = createAdminClient();
  const { data: acc } = await db.from("accounts").select("is_platform_admin").eq("id", id).maybeSingle();
  if (!acc) return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  if (acc.is_platform_admin) return NextResponse.json({ error: "ลบผู้ดูแลระบบไม่ได้" }, { status: 400 });
  const { count } = await db.from("staff").select("id", { count: "exact", head: true }).eq("account_id", id).eq("role", "owner").eq("is_active", true);
  if (count) return NextResponse.json({ error: "บัญชีนี้ยังเป็นเจ้าของ Workspace อยู่ ลบ Workspace ก่อน" }, { status: 409 });
  // memberships end with the login
  await db.from("staff").update({ is_active: false }).eq("account_id", id);
  const { error } = await db.from("accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
