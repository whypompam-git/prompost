import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

async function owner(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ error: "account disabled" }, { status: 401 });
  if (live.role !== "owner") return NextResponse.json({ error: "no access" }, { status: 403 });
  return live;
}

const COLS = "id, name, phone, line_id, email, business_name, role, team_size, client_count, source, source_clip, interests, message, utm, status, admin_note, created_at";

export async function GET(request: NextRequest) {
  const me = await owner(request);
  if (me instanceof NextResponse) return me;
  const { data, error } = await workspaceDb(me.workspaceId).from("waitlist_signups").select(COLS).order("created_at", { ascending: true }).limit(2000);
  if (error) return NextResponse.json({ error: "โหลดไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({
    signups: (data ?? []).map((r, i) => ({ id: r.id, position: i + 1, name: r.name, phone: r.phone, lineId: r.line_id, email: r.email, businessName: r.business_name, role: r.role, teamSize: r.team_size, clientCount: r.client_count, source: r.source, sourceClip: r.source_clip, interests: r.interests ?? [], message: r.message, utm: r.utm, status: r.status, adminNote: r.admin_note, createdAt: r.created_at })),
  });
}

export async function PATCH(request: NextRequest) {
  const me = await owner(request);
  if (me instanceof NextResponse) return me;
  const b = await request.json().catch(() => ({}));
  if (typeof b.id !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.status !== undefined) {
    if (!["new", "contacted", "invited", "joined", "declined"].includes(b.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
    patch.status = b.status;
  }
  if (b.adminNote !== undefined) patch.admin_note = String(b.adminNote).slice(0, 1000);
  const { error } = await workspaceDb(me.workspaceId).from("waitlist_signups").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const me = await owner(request);
  if (me instanceof NextResponse) return me;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const { error } = await workspaceDb(me.workspaceId).from("waitlist_signups").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
