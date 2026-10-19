import { notFound } from "next/navigation";
import { Film } from "lucide-react";
import { PortalTaskList } from "@/components/portal/PortalTaskList";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { LinkRevoked } from "@/components/portal/LinkRevoked";
import { findPortalClient } from "@/lib/portalClient";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { StatTile } from "@/components/portal/StatTile";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import type { TaskStatus, TaskType } from "@/lib/types";
import { summarizeStages } from "@/lib/workflow";

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

  const { total, groups } = summarizeStages(taskList);
  const TONES: Record<string, "gray" | "emerald" | "sky" | "amber" | "violet" | "rose"> = {
    plan: "violet",
    shoot: "sky",
    edit: "amber",
    pending: "rose",
    approved: "emerald",
    posted: "emerald",
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <PortalHeader title={`แดชบอร์ดของ ${client.name}`} />

        <PortalTabs basePath={basePath} active="dashboard" />

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <StatTile label="คลิปทั้งหมด" value={total} tone="gray" />
          {groups.map((g) => (
            <StatTile key={g.key} label={g.label} value={g.count} tone={TONES[g.key] ?? "gray"} />
          ))}
        </div>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Film size={15} />
            รายการงาน/คลิป
          </h2>
          <PortalTaskList tasks={taskList} clientKey={clientKey} />
        </section>
      </div>
    </div>
  );
}
