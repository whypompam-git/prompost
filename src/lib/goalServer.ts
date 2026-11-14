// Server-only: Progress Tracking goals + progress for one or many people.
import type { SupabaseClient } from "@supabase/supabase-js";
import { bangkokDay } from "@/lib/alerts";
import { countGoal, goalWindow, type GoalMode } from "@/lib/goalProgress";

export type GoalProgress = {
  goal: { target: number; mode: GoalMode; startDate: string | null; setById: string | null; setByName: string | null } | null;
  window: { from: string; to: string | null };
  today: string;
  edit: number;
  shoot: number;
  total: number;
};

export async function goalProgressFor(db: SupabaseClient, staffIds: string[]): Promise<Map<string, GoalProgress>> {
  const out = new Map<string, GoalProgress>();
  if (!staffIds.length) return out;
  const today = bangkokDay(new Date());
  const [{ data: rows }, { data: staff }] = await Promise.all([
    db.from("staff_goals").select("staff_id, target, mode, start_date, set_by").in("staff_id", staffIds),
    db.from("staff").select("id, name"),
  ]);
  const nameOf = (id?: string | null) => (id ? ((staff ?? []).find((s) => s.id === id)?.name ?? null) : null);
  const goals = new Map((rows ?? []).map((r) => [r.staff_id as string, r]));
  const windows = new Map(staffIds.map((id) => {
    const r = goals.get(id);
    return [id, goalWindow({ mode: (r?.mode as GoalMode) ?? "month", startDate: r?.start_date ?? null }, today)];
  }));
  const minFrom = [...windows.values()].map((w) => w.from).sort()[0];
  const ids = staffIds.join(",");
  const { data: tasks } = await db
    .from("tasks")
    .select("id, type, editor_id, shot_by, edit_date, scheduled_date")
    .or(`and(editor_id.in.(${ids}),edit_date.gte.${minFrom}),and(shot_by.in.(${ids}),scheduled_date.gte.${minFrom})`)
    .limit(10000);
  const list = (tasks ?? []).map((t) => ({ id: t.id, type: t.type, editorId: t.editor_id, shotBy: t.shot_by, editDate: t.edit_date, scheduledDate: t.scheduled_date }));
  for (const id of staffIds) {
    const r = goals.get(id);
    const win = windows.get(id)!;
    out.set(id, {
      goal: r ? { target: r.target, mode: r.mode as GoalMode, startDate: r.start_date, setById: r.set_by ?? null, setByName: r.set_by && r.set_by !== id ? nameOf(r.set_by) : null } : null,
      window: win,
      today,
      ...countGoal(id, list, win),
    });
  }
  return out;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// validate + save (target 0/null clears)
export async function saveGoal(db: SupabaseClient, staffId: string, setBy: string, body: { target?: unknown; mode?: unknown; startDate?: unknown }): Promise<string | null> {
  const { target, mode, startDate } = body;
  if (target === 0 || target === null) {
    const { error } = await db.from("staff_goals").delete().eq("staff_id", staffId);
    return error?.message ?? null;
  }
  if (!Number.isInteger(target) || (target as number) < 1 || (target as number) > 100000 || (mode !== "month" && mode !== "from") || (mode === "from" && (typeof startDate !== "string" || !ISO.test(startDate)))) {
    return "ข้อมูลเป้าหมายไม่ถูกต้อง";
  }
  const { error } = await db
    .from("staff_goals")
    .upsert({ staff_id: staffId, target, mode, start_date: mode === "from" ? startDate : null, set_by: setBy, updated_at: new Date().toISOString() });
  return error?.message ?? null;
}
