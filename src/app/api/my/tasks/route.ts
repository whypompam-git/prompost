import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMe } from "@/lib/myWork";
import { MY_STAGES, type MyTask } from "@/lib/myWorkTypes";
import { freelanceProgress, monthlyProgress } from "@/lib/contractProgress";
import { bangkokDay } from "@/lib/alerts";

export const dynamic = "force-dynamic";

// The caller's own clips (editor_id = them) — only the fields an editor needs:
// no money, no difficulty, no delivery date, no other people, no brand brief.
export async function GET(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;

  const db = createAdminClient();
  const { data, error } = await db
    .from("tasks")
    .select("id, title, type, status, client_id, edit_date, due_date, script_text, shots, equipment, notes, footage_url, ref_link, final_url, revision_count, revision_brief, clients(name)")
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
      clientId: r.client_id,
      editDate: r.edit_date ?? r.due_date, // the one deadline an editor sees; falls back to the due date so clips without an edit date still show
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
  // the caller's current signed contract: how far along it is (counts only, no money)
  let contract: { kind: string; contractNo: string; target: number; done: number; shootTarget?: number; shootDays?: number; month?: string } | null = null;
  const { data: cs } = await db
    .from("contracts")
    .select("id, kind, contract_no, clip_count, terms, client_signed_at")
    .eq("staff_id", me.staffId)
    .eq("status", "signed")
    .order("client_signed_at", { ascending: false })
    .limit(5);
  const today = bangkokDay(new Date());
  const freelance = (cs ?? []).find((c) => c.kind === "freelance");
  const monthly = (cs ?? []).find((c) => c.kind === "monthly");
  if (freelance) {
    const { data: linked } = await db.from("tasks").select("type, contract_id").eq("contract_id", freelance.id);
    const p = freelanceProgress(freelance.id, (linked ?? []).map((t) => ({ contractId: t.contract_id, type: t.type })));
    contract = { kind: "freelance", contractNo: freelance.contract_no, target: freelance.clip_count ?? 0, done: p.passed };
  } else if (monthly) {
    const month = today.slice(0, 7);
    const [{ data: mt }, { data: qs }] = await Promise.all([
      db.from("tasks").select("type, editor_id, shot_by, edit_date, scheduled_date").or(`editor_id.eq.${me.staffId},shot_by.eq.${me.staffId}`).gte("edit_date", `${month}-01`).limit(500),
      db.from("queues").select("crew, shoot_date").contains("crew", [me.staffId]).gte("shoot_date", `${month}-01`),
    ]);
    const p = monthlyProgress(
      me.staffId,
      month,
      (mt ?? []).map((t) => ({ editorId: t.editor_id, shotBy: t.shot_by, type: t.type, editDate: t.edit_date, scheduledDate: t.scheduled_date })),
      (qs ?? []).map((q) => ({ crew: q.crew ?? [], shootDate: q.shoot_date })),
      today,
    );
    const terms = (monthly.terms ?? {}) as { clipsPerMonth?: number; shootDaysPerMonth?: number };
    contract = { kind: "monthly", contractNo: monthly.contract_no, target: terms.clipsPerMonth ?? 0, done: p.clipsPassed, shootTarget: terms.shootDaysPerMonth ?? 0, shootDays: p.shootDays, month };
  }
  return NextResponse.json({ me: me.name, tasks, contract });
}
