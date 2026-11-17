import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROMPOST_WORKSPACE_ID, workspaceDb } from "@/lib/supabase/workspaceDb";
import { requirePlatformAdmin } from "@/lib/auth/platformAdmin";
import { collectClientRows, fixDanglingDrafts } from "@/lib/backupRestore";
import { loadBackup } from "@/lib/backupServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Platform admin: put a deleted client back from a backup — the client and its clips, queues,
// packages, documents, notes, CI, AI context, revision history and comments. Rows that already
// exist are left as they are (nothing is overwritten). Draft video files deleted with the client
// are not in the backup, so restored clips show no draft.
export async function POST(request: NextRequest) {
  const me = await requirePlatformAdmin(request);
  if (me instanceof NextResponse) return me;
  const { file, clientId } = await request.json().catch(() => ({}));
  if (typeof file !== "string" || !isUuid(clientId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const { data: exists } = await createAdminClient().from("clients").select("id").eq("id", clientId).maybeSingle();
  if (exists) return NextResponse.json({ error: "ลูกค้ารายนี้ยังอยู่ในระบบ ไม่ต้องกู้" }, { status: 409 });
  const dump = await loadBackup(file);
  if (!dump) return NextResponse.json({ error: "ไม่พบไฟล์ backup" }, { status: 404 });
  const groups = fixDanglingDrafts(collectClientRows(dump, clientId));
  if (!groups.length) return NextResponse.json({ error: "ไม่พบลูกค้ารายนี้ใน backup นี้" }, { status: 404 });

  // backups from before workspaces existed have no workspace_id: those rows were PromPost's
  const ws = (groups[0].rows[0].workspace_id as string | undefined) ?? PROMPOST_WORKSPACE_ID;
  const db = workspaceDb(ws);
  const restored: Record<string, number> = {};
  for (const g of groups) {
    const key = g.table === "client_ci" ? "client_id" : g.table === "client_context" ? "client_id,key" : "id";
    const { error } = await db.from(g.table).upsert(g.rows, { onConflict: key, ignoreDuplicates: true });
    if (error) {
      return NextResponse.json({ error: `${g.table}: ${error.message}`, restored }, { status: 500 });
    }
    restored[g.table] = g.rows.length;
  }
  return NextResponse.json({ ok: true, restored });
}
