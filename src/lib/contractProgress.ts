// Pure: how much of a team member's contract has been delivered. Stages are tasks.type.

// edited and handed on (QC or later)
export const DELIVERED = new Set(["qc", "pending", "approved", "posted"]);
// past QC — what the contract pays for
export const PASSED = new Set(["pending", "approved", "posted"]);

export type ProgressTask = { contractId?: string | null; editorId?: string | null; shotBy?: string | null; type: string; editDate?: string | null; scheduledDate?: string | null };

export function freelanceProgress(contractId: string, tasks: ProgressTask[]) {
  const mine = tasks.filter((t) => t.contractId === contractId);
  return { assigned: mine.length, delivered: mine.filter((t) => DELIVERED.has(t.type)).length, passed: mine.filter((t) => PASSED.has(t.type)).length };
}

// month = "YYYY-MM"; a clip counts in the month of its edit date (วันตัดต่อ), a shoot day once per distinct date
export function monthlyProgress(staffId: string, month: string, tasks: ProgressTask[], queues: { crew: string[]; shootDate?: string | null }[], today: string) {
  const inMonth = (d?: string | null) => !!d && d.slice(0, 7) === month;
  const clips = tasks.filter((t) => t.editorId === staffId && inMonth(t.editDate));
  const days = new Set<string>();
  for (const q of queues) if (q.shootDate && inMonth(q.shootDate) && q.shootDate <= today && q.crew.includes(staffId)) days.add(q.shootDate);
  for (const t of tasks) if (t.shotBy === staffId && inMonth(t.scheduledDate) && (t.scheduledDate as string) <= today) days.add(t.scheduledDate as string);
  return { clipsPlanned: clips.length, clipsPassed: clips.filter((t) => PASSED.has(t.type)).length, shootDays: days.size };
}

export const withholdingFor = (amount: number, withholding?: boolean) => (withholding ? Math.round(amount * 3) / 100 : 0);
