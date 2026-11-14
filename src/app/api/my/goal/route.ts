import { NextResponse, type NextRequest } from "next/server";
import { requireMe } from "@/lib/myWork";
import { bangkokDay } from "@/lib/alerts";
import { countGoal, goalWindow, type Goal } from "@/lib/goalProgress";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// The caller's own goal and how far they are (clips edited that passed QC + clips shot).
export async function GET(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const db = createAdminClient();
  const { data: row } = await db.from("staff_goals").select("target, mode, start_date").eq("staff_id", me.staffId).maybeSingle();
  const goal: Goal | null = row ? { target: row.target, mode: row.mode, startDate: row.start_date } : null;
  const today = bangkokDay(new Date());
  const win = goalWindow(goal ?? { mode: "month", startDate: null }, today);
  const { data, error } = await db
    .from("tasks")
    .select("id, type, editor_id, shot_by, edit_date, scheduled_date")
    .or(`and(editor_id.eq.${me.staffId},edit_date.gte.${win.from}),and(shot_by.eq.${me.staffId},scheduled_date.gte.${win.from})`)
    .limit(3000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const counts = countGoal(
    me.staffId,
    (data ?? []).map((t) => ({ id: t.id, type: t.type, editorId: t.editor_id, shotBy: t.shot_by, editDate: t.edit_date, scheduledDate: t.scheduled_date })),
    win,
  );
  return NextResponse.json({ goal, window: win, today, ...counts });
}

// Set (or clear with target 0) the caller's own goal.
export async function POST(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const { target, mode, startDate } = await request.json().catch(() => ({}));
  const db = createAdminClient();
  if (target === 0 || target === null) {
    await db.from("staff_goals").delete().eq("staff_id", me.staffId);
    return NextResponse.json({ ok: true });
  }
  if (!Number.isInteger(target) || target < 1 || target > 100000 || !["month", "from"].includes(mode) || (mode === "from" && (typeof startDate !== "string" || !ISO.test(startDate)))) {
    return NextResponse.json({ error: "ข้อมูลเป้าหมายไม่ถูกต้อง" }, { status: 400 });
  }
  const { error } = await db
    .from("staff_goals")
    .upsert({ staff_id: me.staffId, target, mode, start_date: mode === "from" ? startDate : null, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
