// Personal goal on the profile page: how many clips someone finished in the
// current month, or since a start date they picked. Pure helpers (tested).

export type GoalMode = "month" | "from";
export type Goal = { target: number; mode: GoalMode; startDate: string | null };
export type GoalTask = { id: string; type: string; editorId?: string | null; shotBy?: string | null; editDate?: string | null; scheduledDate?: string | null };

// a clip counts for its editor once it passed QC, for its shooter once it was shot
const EDIT_DONE = new Set(["pending", "approved", "posted"]);
const SHOT = new Set(["edit", "qc", "pending", "approved", "posted"]);

const pad = (n: number) => String(n).padStart(2, "0");

export function goalWindow(goal: Pick<Goal, "mode" | "startDate">, today: string): { from: string; to: string | null } {
  const [y, m] = today.split("-").map(Number);
  const monthStart = `${y}-${pad(m)}-01`;
  if (goal.mode === "from" && goal.startDate) return { from: goal.startDate, to: null };
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: monthStart, to: `${y}-${pad(m)}-${pad(last)}` };
}

export function countGoal(staffId: string, tasks: GoalTask[], win: { from: string; to: string | null }) {
  const inWin = (d?: string | null) => !!d && d >= win.from && (win.to == null || d <= win.to);
  const edit = new Set<string>();
  const shoot = new Set<string>();
  for (const t of tasks) {
    if (t.editorId === staffId && EDIT_DONE.has(t.type) && inWin(t.editDate)) edit.add(t.id);
    if (t.shotBy === staffId && SHOT.has(t.type) && inWin(t.scheduledDate)) shoot.add(t.id);
  }
  return { edit: edit.size, shoot: shoot.size, total: new Set([...edit, ...shoot]).size };
}
