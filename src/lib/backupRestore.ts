// Pure helpers to bring a deleted client back from a nightly backup (scripts/backup.mjs):
// the client row plus everything that hung off it, in an order the foreign keys accept.

export type Dump = { takenAt: string; tables: Record<string, Record<string, unknown>[]> };
type Row = Record<string, unknown>;

// rows that belong to the client directly (client_id), parents before children
const CLIENT_TABLES = ["queues", "client_packages", "quotations", "invoices", "receipts", "tasks", "client_notes", "client_ci", "client_context"];
// rows that belong to the client's tasks (task_id)
const TASK_TABLES = ["task_drafts", "task_revisions", "draft_comments"];

export function findClients(dump: Dump, query: string): Row[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return (dump.tables.clients ?? []).filter((c) => [c.name, c.name_en, c.slug].some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
}

export function collectClientRows(dump: Dump, clientId: string): { table: string; rows: Row[] }[] {
  const client = (dump.tables.clients ?? []).filter((c) => c.id === clientId);
  if (!client.length) return [];
  const out: { table: string; rows: Row[] }[] = [{ table: "clients", rows: client }];
  for (const t of CLIENT_TABLES) out.push({ table: t, rows: (dump.tables[t] ?? []).filter((r) => r.client_id === clientId) });
  const taskIds = new Set((dump.tables.tasks ?? []).filter((r) => r.client_id === clientId).map((r) => r.id));
  for (const t of TASK_TABLES) out.push({ table: t, rows: (dump.tables[t] ?? []).filter((r) => taskIds.has(r.task_id)) });
  return out.filter((x) => x.rows.length > 0);
}

// a comment pointing at a draft that isn't coming back loses the link, not the comment
export function fixDanglingDrafts(groups: { table: string; rows: Row[] }[]): { table: string; rows: Row[] }[] {
  const drafts = new Set((groups.find((g) => g.table === "task_drafts")?.rows ?? []).map((r) => r.id));
  return groups.map((g) => (g.table === "draft_comments" ? { ...g, rows: g.rows.map((r) => (r.draft_id && !drafts.has(r.draft_id) ? { ...r, draft_id: null } : r)) } : g));
}
