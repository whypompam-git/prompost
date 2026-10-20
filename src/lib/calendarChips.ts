// The calendar shows one summary chip per (client, queue, stage group, day),
// not one per clip: "ถ่าย คิว1-OYOKO · 10 คลิป · นุ่น, กาย". Plan clips are
// not started yet, so they never appear. Pure + unit-tested.
import type { Client, Queue, Staff, Task } from "./types.ts";

export type ChipGroup = "shoot" | "edit" | "send" | "other";

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
};

const GROUP_LABEL: Record<Exclude<ChipGroup, "other">, string> = { shoot: "ถ่าย", edit: "ตัดต่อ", send: "ส่งงาน" };

// shoot → the queue's shoot date; edit/QC and sent-to-client → each clip's due date
function placement(t: Task, queues: Map<string, Queue>): { group: ChipGroup; date: string | undefined } | null {
  switch (t.type) {
    case "shoot":
      return { group: "shoot", date: t.queueId ? queues.get(t.queueId)?.shootDate : undefined };
    case "edit":
    case "qc":
      return { group: "edit", date: t.dueDate };
    case "pending":
      return { group: "send", date: t.dueDate };
    case "other":
      return t.status === "done" ? null : { group: "other", date: t.scheduledDate };
    default:
      return null; // plan, approved, posted, rejected
  }
}

export function buildCalendarChips(input: { tasks: Task[]; queues: Queue[]; clients: Client[]; staff: Staff[] }): CalendarChip[] {
  const queues = new Map(input.queues.map((q) => [q.id, q]));
  const clientName = (id: string) => input.clients.find((c) => c.id === id)?.name ?? "—";
  const staffName = (id: string) => input.staff.find((s) => s.id === id)?.name;
  const chips = new Map<string, CalendarChip & { names: Set<string> }>();

  for (const t of input.tasks) {
    const p = placement(t, queues);
    if (!p || !p.date) continue;
    if (p.group === "other") {
      chips.set(`task:${t.id}`, { key: `task:${t.id}`, date: p.date, clientId: t.clientId, queueId: null, group: "other", count: 1, label: t.title, crew: [], names: new Set(), href: `/tasks/${t.id}` });
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
      };
      if (p.group === "shoot" && q) for (const id of q.crew) staffName(id) && chip.names.add(staffName(id)!);
      chips.set(key, chip);
    }
    chip.count += 1;
    if (p.group !== "shoot" && t.assigneeId && staffName(t.assigneeId)) chip.names.add(staffName(t.assigneeId)!);
  }

  return [...chips.values()]
    .map(({ names, ...c }) => ({ ...c, crew: [...names] }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label, "th"));
}
