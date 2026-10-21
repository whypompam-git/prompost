import { NextResponse } from "next/server";
import { requireAiToken } from "@/lib/aiAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE = 1000;

// Read-only snapshot for the Claude workspace: clients (without link tokens),
// notes, tasks, packages, billing rounds and content sets. ?client=<slug>
// narrows tasks/notes/rounds to one client.
export async function GET(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;

  const db = createAdminClient();
  const slug = new URL(request.url).searchParams.get("client");

  async function all(table: string, order: { column: string; ascending: boolean }[], filter?: (q: any) => any) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      let q: any = db.from(table).select("*");
      if (filter) q = filter(q);
      for (const o of order) q = q.order(o.column, { ascending: o.ascending });
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data ?? []));
      if ((data ?? []).length < PAGE) break;
    }
    return rows;
  }

  try {
    let clients = await all("clients", [{ column: "priority", ascending: false }, { column: "created_at", ascending: true }]);
    clients = clients.map(({ portal_token: _omit, ...rest }) => rest);
    if (slug) clients = clients.filter((c) => c.slug === slug);
    const ids = new Set(clients.map((c) => c.id as string));
    const forClients = (rows: Record<string, unknown>[]) => (slug ? rows.filter((r) => ids.has(r.client_id as string)) : rows);

    const [client_notes, tasks, packages, client_packages, content_sets, queues, teams, staff] = await Promise.all([
      all("client_notes", [{ column: "note_date", ascending: false }, { column: "created_at", ascending: false }], (q) => q.is("deleted_at", null)),
      all("tasks", [{ column: "scheduled_date", ascending: false }]),
      all("packages", [{ column: "created_at", ascending: false }]),
      all("client_packages", [{ column: "assigned_at", ascending: false }]),
      all("content_sets", [{ column: "created_at", ascending: false }]),
      all("queues", [{ column: "created_at", ascending: true }]),
      all("teams", [{ column: "sort_order", ascending: true }]),
      all("staff", [{ column: "created_at", ascending: true }], (q) => q.eq("is_active", true)),
    ]);
    return NextResponse.json({
      clients,
      client_notes: forClients(client_notes),
      tasks: forClients(tasks),
      packages,
      client_packages: forClients(client_packages),
      content_sets,
      queues: forClients(queues),
      teams,
      // id + name + team only (no pay, bank or pin data)
      staff: staff.map((s) => ({ id: s.id, name: s.name, position: s.position, team_id: s.team_id })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
