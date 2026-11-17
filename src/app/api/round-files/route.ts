import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { isUuid } from "@/lib/aiApi";

export const dynamic = "force-dynamic";

// Files the client sent, filed under a package round. The bucket is private: staff of the
// workspace get a short-lived link; clients never see these.
async function who(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ error: "account disabled" }, { status: 401 });
  if (live.ownOnly) return NextResponse.json({ error: "not available for this account" }, { status: 403 });
  return { ...live, canWrite: live.role === "owner" || live.permissions.documents || live.permissions.accounting };
}

export async function GET(request: NextRequest) {
  const me = await who(request);
  if (me instanceof NextResponse) return me;
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { data: row } = await workspaceDb(me.workspaceId).from("round_files").select("path, name").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data } = await createAdminClient().storage.from("round-files").createSignedUrl(row.path, 60 * 10, { download: row.name });
  if (!data?.signedUrl) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(request: NextRequest) {
  const me = await who(request);
  if (me instanceof NextResponse) return me;
  if (!me.canWrite) return NextResponse.json({ error: "needs documents/accounting permission" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const db = workspaceDb(me.workspaceId);
  const { data: row } = await db.from("round_files").select("path").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  await createAdminClient().storage.from("round-files").remove([row.path]);
  const { error } = await db.from("round_files").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
