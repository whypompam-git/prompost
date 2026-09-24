import { notFound } from "next/navigation";
import { Film } from "lucide-react";
import { PortalTaskList } from "@/components/portal/PortalTaskList";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { LinkRevoked } from "@/components/portal/LinkRevoked";
import { findPortalClient } from "@/lib/portalClient";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { StatTile } from "@/components/portal/StatTile";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, title, type, status, script_text, footage_url, final_url, equipment, shots")
    .eq("client_id", client.id)
    .order("scheduled_date", { ascending: false });

  const taskList = (tasks ?? []) as {
    id: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
    script_text: string | null;
    footage_url: string | null;
    final_url: string | null;
    equipment: string[] | null;
    shots: string[] | null;
  }[];

  const total = taskList.length;
  const done = taskList.filter((t) => t.status === "done").length;
  const inProgress = taskList.filter((t) => t.status === "in_progress" || t.status === "review").length;
  const todo = taskList.filter((t) => t.status === "todo").length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <PortalHeader title={`แดชบอร์ดของ ${client.name}`} />

        <PortalTabs basePath={basePath} active="dashboard" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="คลิปทั้งหมด" value={total} tone="gray" />
          <StatTile label="เสร็จแล้ว" value={done} tone="emerald" />
          <StatTile label="กำลังทำ" value={inProgress} tone="sky" />
          <StatTile label="ยังไม่ทำ" value={todo} tone="amber" />
        </div>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Film size={15} />
            รายการงาน/คลิป
          </h2>
          <PortalTaskList tasks={taskList} />
        </section>
      </div>
    </div>
  );
}
