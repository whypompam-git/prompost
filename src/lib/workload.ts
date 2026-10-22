// "สรุปงาน" board: who is doing what today and over the next days. Pure and
// unit-tested. Three dates per clip: shoot (the queue's shoot date), edit
// (tasks.edit_date — when editors work) and delivery (due_date — shown on the
// client manager's row, not the editor's).
import type { Client, Queue, Staff, Task } from "./types.ts";

export type CardKind = "shoot" | "edit" | "qc" | "other" | "delivery";

export type WorkCard = {
  key: string;
  kind: CardKind;
  rowId: string; // staff id, or "none"
  column: string; // "overdue" or YYYY-MM-DD
  date: string; // the real date the card is planned for
  clientId: string;
  title: string; // small second line
  count: number;
  deadline: string; // delivery deadline (earliest due date among the clips)
  href: string;
  titles: string[];
};

export type WaitingSummary = {
  clientId: string;
  plan: number; // Plan — waiting for the client to choose
  pending: number; // Pending — waiting for the client to approve
  unqueued: number; // shoot stage, no queue/date yet
  noEditDate: number; // edit/QC without a วันตัดต่อ
};

export type WorkBoard = {
  columns: string[]; // "overdue", then each day
  cards: WorkCard[];
  waiting: WaitingSummary[];
};

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function buildWorkBoard(input: {
  tasks: Task[];
  queues: Queue[];
  clients: Client[];
  staff: Staff[];
  today: string;
  days: number;
}): WorkBoard {
  const { today } = input;
  const last = addDays(today, input.days - 1);
  const queues = new Map(input.queues.map((q) => [q.id, q]));
  const clients = new Map(input.clients.map((c) => [c.id, c]));
  const staffIds = new Set(input.staff.map((s) => s.id));
  const column = (date: string) => (date < today ? "overdue" : date <= last ? date : null);
  const rowOf = (id?: string | null) => (id && staffIds.has(id) ? id : "none");

  const cards = new Map<string, WorkCard>();
  const add = (key: string, base: Omit<WorkCard, "key" | "column" | "count" | "titles" | "deadline">, task: Task) => {
    const col = column(base.date);
    if (!col) return;
    const k = `${key}|${col === "overdue" ? "overdue" : base.date}`;
    const card = cards.get(k);
    if (card) {
      card.count += 1;
      card.titles.push(task.title);
      if (task.dueDate < card.deadline) card.deadline = task.dueDate;
    } else {
      cards.set(k, { ...base, key: k, column: col, count: 1, titles: [task.title], deadline: task.dueDate });
    }
  };

  const waiting = new Map<string, WaitingSummary>();
  const wait = (clientId: string) => {
    let w = waiting.get(clientId);
    if (!w) waiting.set(clientId, (w = { clientId, plan: 0, pending: 0, unqueued: 0, noEditDate: 0 }));
    return w;
  };

  for (const t of input.tasks) {
    const client = clients.get(t.clientId);
    const clientHref = `/clients/${t.clientId}`;
    if (t.type === "plan") wait(t.clientId).plan += 1;
    else if (t.type === "pending") wait(t.clientId).pending += 1;

    // ---- delivery: on the client manager's row, up to the hand-off to the client
    if (["shoot", "edit", "qc"].includes(t.type) && t.dueDate) {
      add(`deliver|${t.clientId}`, { kind: "delivery", rowId: rowOf(client?.managerId), date: t.dueDate, clientId: t.clientId, title: "ส่งงาน", href: `${clientHref}?stage=edit` }, t);
    }

    // ---- work cards
    if (t.type === "shoot") {
      const q = t.queueId ? queues.get(t.queueId) : undefined;
      if (!q?.shootDate) {
        wait(t.clientId).unqueued += 1;
      } else if (t.status !== "done") {
        const owners = q.crew.length > 0 ? q.crew.map(rowOf) : ["none"];
        for (const owner of new Set(owners)) {
          add(`shoot|${q.id}|${owner}`, { kind: "shoot", rowId: owner, date: q.shootDate, clientId: t.clientId, title: q.name, href: `${clientHref}?stage=shoot&queue=${q.id}` }, t);
        }
      }
    } else if (t.type === "edit" || t.type === "qc") {
      if (!t.editDate) wait(t.clientId).noEditDate += 1;
      else add(`${t.type}|${t.clientId}|${rowOf(t.assigneeId)}`, { kind: t.type, rowId: rowOf(t.assigneeId), date: t.editDate, clientId: t.clientId, title: t.title, href: `/tasks/${t.id}` }, t);
    } else if (t.type === "other" && t.status !== "done") {
      add(`other|${t.id}`, { kind: "other", rowId: rowOf(t.assigneeId), date: t.editDate ?? t.scheduledDate, clientId: t.clientId, title: t.title, href: `/tasks/${t.id}` }, t);
    }
  }

  // aggregated cards link to the client page instead of one clip
  for (const c of cards.values()) {
    if (c.count > 1 && (c.kind === "edit" || c.kind === "qc")) {
      c.title = `${c.count} คลิป`;
      c.href = `/clients/${c.clientId}?stage=edit`;
    } else if (c.kind === "shoot") {
      c.title = `${c.title} · ${c.count} คลิป`;
    } else if (c.kind === "delivery") {
      c.title = `ส่งงาน · ${c.count} คลิป`;
    }
  }

  const columns = ["overdue", ...Array.from({ length: input.days }, (_, i) => addDays(today, i))];
  return {
    columns,
    cards: [...cards.values()].sort((a, b) => a.column.localeCompare(b.column) || a.kind.localeCompare(b.kind)),
    waiting: [...waiting.values()].filter((w) => w.plan + w.pending + w.unqueued + w.noEditDate > 0),
  };
}
