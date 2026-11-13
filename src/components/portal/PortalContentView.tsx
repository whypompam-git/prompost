import { notFound } from "next/navigation";
import { Film } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <PortalHeader title={`แดชบอร์ดของ ${client.name}`} />

        <PortalTabs basePath={basePath} active="dashboard" />

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Film size={15} />
            รายการงาน/คลิป
          </h2>
          <PortalTaskList tasks={taskList.map((t) => ({ ...t, draft_url: draftUrls[t.id] ?? null }))} clientKey={clientKey} />
        </section>
      </div>
    </div>
  );
}
