import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMe } from "@/lib/myWork";
import { MY_STAGES, type MyTask } from "@/lib/myWorkTypes";

export const dynamic = "force-dynamic";

// The caller's own clips (editor_id = them) — only the fields an editor needs:
// no money, no difficulty, no delivery date, no other people, no brand brief.
export async function GET(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;

  const db = createAdminClient();
  const { data, error } = await db
    .from("tasks")
    .select("id, title, type, status, edit_date, script_text, shots, equipment, notes, footage_url, ref_link, final_url, revision_count, revision_brief, clients(name)")
    .eq("editor_id", me.staffId)
    .in("type", [...MY_STAGES])
    .order("edit_date", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(400);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks: MyTask[] = (data ?? []).map((r) => {
    const c = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    return {
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      clientName: (c as { name: string } | null)?.name ?? "",
      editDate: r.edit_date, // delivery date (due_date) is the main team's business and is never sent here
      scriptText: r.script_text,
      shots: r.shots ?? [],
      equipment: r.equipment ?? [],
      notes: r.notes,
      footageUrl: r.footage_url,
      refLink: r.ref_link,
      finalUrl: r.final_url,
      revisionCount: r.revision_count ?? 0,
      revisionBrief: r.revision_brief,
    };
  });
  return NextResponse.json({ me: me.name, tasks });
}
