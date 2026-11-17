import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/auth/platformAdmin";
import { findClients } from "@/lib/backupRestore";
import { loadBackup } from "@/lib/backupServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Platform admin: search every nightly backup for clients by name / English name / link —
// to find out when a client disappeared. The backups never leave the server.
export async function GET(request: NextRequest) {
  const me = await requirePlatformAdmin(request);
  if (me instanceof NextResponse) return me;
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ error: "พิมพ์อย่างน้อย 2 ตัวอักษร" }, { status: 400 });

  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("backups").list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
  const { data: live } = await admin.from("clients").select("id");
  const liveIds = new Set((live ?? []).map((c) => c.id));
  const results = [];
  for (const f of (files ?? []).filter((x) => x.name.startsWith("backup-"))) {
    const dump = await loadBackup(f.name);
    if (!dump) continue;
    results.push({
      file: f.name,
      takenAt: dump.takenAt,
      clients: findClients(dump, q).map((c) => ({
        id: c.id,
        name: c.name,
        nameEn: c.name_en ?? null,
        slug: c.slug ?? null,
        tasks: (dump.tables.tasks ?? []).filter((t) => t.client_id === c.id).length,
        existsNow: liveIds.has(c.id as string),
      })),
    });
  }
  return NextResponse.json({ results });
}
