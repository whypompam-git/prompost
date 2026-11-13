import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Film } from "lucide-react";
import { loadPortalClient } from "@/lib/portalData";
import { PortalTaskList } from "@/components/portal/PortalTaskList";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { LinkRevoked } from "@/components/portal/LinkRevoked";
import { findPortalClient } from "@/lib/portalClient";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { signedDraftUrl } from "@/lib/draftsServer";
import type { TaskStatus, TaskType } from "@/lib/types";

// Public client portal — reached via an unguessable token, no login required.
// Currently reads through the anon key with open RLS (no policies yet — see
// the migration's own note). Fine for now with no auth in the app at all;
// once staff accounts exist, this should move behind a service-role backend
// call keyed on portal_token, the same pattern hops's own customer-booking
// link uses, so a client can never see another client's RLS-gated rows.
export async function PortalContentView({ clientKey, basePath }: { clientKey: string; basePath: string }) {
  const supabase = createClient();

  const client = await findPortalClient(clientKey);
  if (!client) notFound();
  if (!client.portal_enabled) return <LinkRevoked />;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, type, status, script_text, ref_link, footage_url, final_url, cover_url, equipment, shots, revision_count, revision_brief")
    .eq("client_id", client.id)
    .order("scheduled_date", { ascending: false });

  const taskList = (tasks ?? []) as {
    id: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
    script_text: string | null;
    ref_link: string | null;
    footage_url: string | null;
    final_url: string | null;
    cover_url: string | null;
    equipment: string[] | null;
    shots: string[] | null;
    revision_count: number | null;
    revision_brief: string | null;
  }[];

  // clips waiting for the client to check play their latest draft right in the card
  const pendingIds = taskList.filter((t) => t.type === "pending").map((t) => t.id);
  const draftUrls: Record<string, string> = {};
  if (pendingIds.length) {
    const { data: drafts } = await supabase.from("task_drafts").select("task_id, version, path").in("task_id", pendingIds).is("removed_at", null).order("version", { ascending: false });
    const seen = new Set<string>();
    for (const d of drafts ?? []) {
      if (seen.has(d.task_id)) continue;
      seen.add(d.task_id);
      const url = await signedDraftUrl(d.path);
      if (url) draftUrls[d.task_id] = url;
    }
  }

  const portal = await loadPortalClient(clientKey);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const { data: nextQueue } = await supabase
    .from("queues")
    .select("name, shoot_date")
    .eq("client_id", client.id)
    .gte("shoot_date", today)
    .order("shoot_date")
    .limit(1)
    .maybeSingle();
  const counted = taskList.filter((t) => t.type !== "rejected" && t.type !== "plan");
  const delivered = counted.filter((t) => t.type === "approved" || t.type === "posted").length;
  const toCheck = taskList.filter((t) => t.type === "pending").length;
  const toChoose = taskList.filter((t) => t.type === "plan").length;
  const fixing = taskList.filter((t) => (t.type === "edit" || t.type === "qc") && (t.revision_count ?? 0) > 0).length;
  const thDate = (iso: string) => new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-28 pt-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <PortalHeader title={client.name} logo={portal?.logo} subtitle="ยินดีต้อนรับ" />

        {/* what needs the client first */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`${basePath}/review`} className={`rounded-2xl p-4 shadow-card ${toCheck ? "bg-rose-500 text-white" : "bg-white text-gray-700"}`}>
            <p className="text-3xl font-bold tabular-nums">{toCheck}</p>
            <p className="text-sm font-medium">คลิปรอคุณตรวจ</p>
            <p className={`mt-1 text-xs ${toCheck ? "text-white/80" : "text-gray-400"}`}>{toCheck ? "แตะเพื่อดูและอนุมัติ →" : "ยังไม่มีคลิปรอตรวจ"}</p>
          </Link>
          <Link href={`${basePath}/plan`} className={`rounded-2xl p-4 shadow-card ${toChoose ? "bg-violet-500 text-white" : "bg-white text-gray-700"}`}>
            <p className="text-3xl font-bold tabular-nums">{toChoose}</p>
            <p className="text-sm font-medium">แผนรอคุณเลือก</p>
            <p className={`mt-1 text-xs ${toChoose ? "text-white/80" : "text-gray-400"}`}>{toChoose ? "เลือก ใช้ / แก้ / ไม่ใช้ →" : "ไม่มีแผนรอเลือก"}</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><CalendarDays size={14} /> คิวถ่ายครั้งถัดไป</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{nextQueue?.shoot_date ? thDate(nextQueue.shoot_date) : "ยังไม่มีคิวถ่าย"}</p>
            {nextQueue?.name && <p className="text-xs text-gray-400">{nextQueue.name}</p>}
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><Film size={14} /> ความคืบหน้า</p>
            <p className="mt-1 text-base font-semibold text-gray-900">ส่งแล้ว {delivered} / {counted.length} คลิป</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: counted.length ? `${Math.round((delivered / counted.length) * 100)}%` : 0 }} />
            </div>
            {fixing > 0 && <p className="mt-1.5 text-xs text-amber-600">ทีมกำลังแก้ตามที่คุณแจ้ง {fixing} คลิป</p>}
          </div>
        </div>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Film size={15} />
            งานทั้งหมด
          </h2>
          <PortalTaskList tasks={taskList.map((t) => ({ ...t, draft_url: draftUrls[t.id] ?? null }))} clientKey={clientKey} />
        </section>
      </div>
      <PortalTabs basePath={basePath} active="dashboard" badges={portal?.badges} />
    </div>
  );
}
