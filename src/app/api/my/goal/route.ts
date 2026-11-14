import { NextResponse, type NextRequest } from "next/server";
import { requireMe } from "@/lib/myWork";
import { fetchLiveAccess } from "@/lib/auth/session";
import { goalProgressFor, saveGoal } from "@/lib/goalServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Progress Tracking: the caller's own goal and how far they are.
export async function GET(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const p = (await goalProgressFor(createAdminClient(), [me.staffId])).get(me.staffId)!;
  return NextResponse.json({ ...p, locked: Boolean(p.goal?.setById && p.goal.setById !== me.staffId) });
}

// Set or clear the caller's own goal — not one the owner set for them (unless they are the owner).
export async function POST(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const db = createAdminClient();
  const { data: row } = await db.from("staff_goals").select("set_by").eq("staff_id", me.staffId).maybeSingle();
  if (row?.set_by && row.set_by !== me.staffId) {
    const live = await fetchLiveAccess(me.staffId);
    if (live?.role !== "owner") return NextResponse.json({ error: "เป้านี้หัวหน้าตั้งให้ แก้เองไม่ได้" }, { status: 403 });
  }
  const err = await saveGoal(db, me.staffId, me.staffId, await request.json().catch(() => ({})));
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
