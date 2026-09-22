import { notFound } from "next/navigation";
import { APP_NAME } from "@/config/branding";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/types";

// Public client portal — reached via an unguessable token, no login required.
// Currently reads through the anon key with open RLS (no policies yet — see
// the migration's own note). Fine for now with no auth in the app at all;
// once staff accounts exist, this should move behind a service-role backend
// call keyed on portal_token, the same pattern hops's own customer-booking
// link uses, so a client can never see another client's RLS-gated rows.
export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("portal_token", params.token)
    .maybeSingle();

  if (!client) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("client_id", client.id)
    .order("scheduled_date", { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{APP_NAME}</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">สถานะงานของ {client.name}</h1>
        </div>

        <Card className="space-y-3">
          {(tasks ?? []).map((task: { id: string; title: string; status: TaskStatus }) => (
            <div key={task.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium text-gray-800">{task.title}</span>
              <StatusBadge status={task.status} />
            </div>
          ))}
          {(!tasks || tasks.length === 0) && (
            <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีงานสำหรับลูกค้ารายนี้</p>
          )}
        </Card>
      </div>
    </div>
  );
}
