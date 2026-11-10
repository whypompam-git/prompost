// The calendar shows one summary chip per (client, queue, stage group, day),
// not one per clip: "ถ่าย คิว1-OYOKO · 10 คลิป · นุ่น, กาย". Plan clips are
// not started yet, so they never appear. Pure + unit-tested.
import type { Client, Queue, Staff, Task } from "./types.ts";

export type ChipGroup = "plan" | "shoot" | "edit" | "other";

export type CalendarChip = {
  key: string;
  date: string; // YYYY-MM-DD
  clientId: string;
  queueId: string | null;
  group: ChipGroup;
  count: number;
  label: string;
  crew: string[]; // names
  href: string;
  taskIds: string[]; // clips in this chip (dragging the chip moves them)
};

const GROUP_LABEL: Record<Exclude<ChipGroup, "other">, string> = { plan: "Plan", shoot: "ถ่าย", edit: "ตัดต่อ" };

// One chip per clip stage — delivery is not shown any more (the delivery date
// is the same as the edit date):
//   plan             → its date (วันถ่าย, still a placeholder until the client picks)
//   shoot            → the queue's shoot date
//   edit / QC        → its วันตัดต่อ (edit_date), when the editors work on it
function placements(t: Task, queues: Map<string, Queue>): { group: ChipGroup; date: string | undefined }[] {
  const out: { group: ChipGroup; date: string | undefined }[] = [];
  switch (t.type) {
    case "plan":
      out.push({ group: "plan", date: t.scheduledDate });
      break;
    case "shoot":
      out.push({ group: "shoot", date: t.queueId ? queues.get(t.queueId)?.shootDate : t.scheduledDate });
      break;
    case "edit":
    case "qc":
      // the delivery deadline is the edit date; clips without one yet fall back to their due date so none go missing
      out.push({ group: "edit", date: t.editDate ?? t.dueDate ?? undefined });
      break;
    case "other":
      if (t.status !== "done") out.push({ group: "other", date: t.scheduledDate });
      break;
  }
  return out;
}

export function buildCalendarChips(input: { tasks: Task[]; queues: Queue[]; clients: Client[]; staff: Staff[] }): CalendarChip[] {
  const queues = new Map(input.queues.map((q) => [q.id, q]));
  const clientName = (id: string) => input.clients.find((c) => c.id === id)?.name ?? "—";
  const staffName = (id: string) => input.staff.find((s) => s.id === id)?.name;
  const chips = new Map<string, CalendarChip & { names: Set<string> }>();

  for (const t of input.tasks) {
    for (const p of placements(t, queues)) {
    if (!p.date) continue;
    if (p.group === "other") {
      chips.set(`task:${t.id}`, { key: `task:${t.id}`, date: p.date, clientId: t.clientId, queueId: null, group: "other", count: 1, label: t.title, crew: [], names: new Set(), href: `/tasks/${t.id}`, taskIds: [t.id] });
      continue;
    }
    const key = `${t.clientId}|${t.queueId ?? "-"}|${p.group}|${p.date}`;
    let chip = chips.get(key);
    if (!chip) {
      const q = t.queueId ? queues.get(t.queueId) : undefined;
      const base = q ? `${q.name}-${clientName(t.clientId)}` : clientName(t.clientId);
      const qs = new URLSearchParams({ stage: p.group });
      if (t.queueId) qs.set("queue", t.queueId);
      chip = {
        key,
        date: p.date,
        clientId: t.clientId,
        queueId: t.queueId ?? null,
        group: p.group,
        count: 0,
        label: `${GROUP_LABEL[p.group]} ${base}`,
        crew: [],
        names: new Set(),
        href: `/clients/${t.clientId}?${qs.toString()}`,
        taskIds: [],
      };
      if (p.group === "shoot" && q) for (const id of q.crew) staffName(id) && chip.names.add(staffName(id)!);
      chips.set(key, chip);
    }
    chip.count += 1;
    chip.taskIds.push(t.id);
    if (p.group === "edit") {
      const who = t.type === "edit" ? (t.editorId ?? t.assigneeId) : t.assigneeId;
      if (who && staffName(who)) chip.names.add(staffName(who)!);
    }
    }
  }

  return [...chips.values()]
    .map(({ names, ...c }) => ({ ...c, crew: [...names] }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label, "th"));
}
