import { ScriptSheets, type SheetTask } from "@/components/print/ScriptSheets";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/aiApi";
import { statusLabel, stageInfo } from "@/lib/workflow";

export const dynamic = "force-dynamic";

// Printable script sheets, one A4 page per clip, each with a QR to the clip
// (login-checked by the middleware). ?ids=a,b,c — printed in that order.
export default async function PrintScriptsPage({ searchParams }: { searchParams: { ids?: string } }) {
  const ids = (searchParams.ids ?? "").split(",").filter(isUuid).slice(0, 60);
  if (ids.length === 0) return <p className="p-8 text-sm text-gray-500">ไม่ได้เลือกงาน</p>;
  const db = createAdminClient();
  const { data } = await db
    .from("tasks")
    .select("id, title, type, status, script_text, shots, equipment, content_category, scheduled_date, edit_date, due_date, notes, clients(name), queues(name)")
    .in("id", ids);
  const byId = new Map((data ?? []).map((r) => [r.id as string, r]));
  const sheets: SheetTask[] = ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => {
      const c = Array.isArray(r.clients) ? r.clients[0] : r.clients;
      const q = Array.isArray(r.queues) ? r.queues[0] : r.queues;
      return {
        id: r.id,
        title: r.title,
        client: (c as { name: string } | null)?.name ?? "",
        queue: (q as { name: string } | null)?.name ?? "",
        stage: stageInfo(r.type)?.label ?? r.type,
        status: statusLabel(r.type, r.status),
        category: r.content_category ?? "",
        shootDate: r.scheduled_date,
        editDate: r.edit_date,
        script: r.script_text ?? "",
        shots: r.shots ?? [],
        equipment: r.equipment ?? [],
        notes: r.notes ?? "",
      };
    });
  return <ScriptSheets sheets={sheets} />;
}
