import { notFound } from "next/navigation";
import { APP_NAME } from "@/config/branding";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { mockClients, mockTasks } from "@/lib/mock-data";

// Public client portal — reached via an unguessable token, no login required.
// Mirrors the real project's own customer-facing link pattern: a service-role
// backend call (not client-side RLS) should serve this once Supabase is wired up.
export default function ClientPortalPage({ params }: { params: { token: string } }) {
  const client = mockClients.find((c) => c.portalToken === params.token);
  if (!client) notFound();

  const tasks = mockTasks.filter((t) => t.clientId === client.id);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{APP_NAME}</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">สถานะงานของ {client.name}</h1>
        </div>

        <Card className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium text-gray-800">{task.title}</span>
              <StatusBadge status={task.status} />
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีงานสำหรับลูกค้ารายนี้</p>
          )}
        </Card>
      </div>
    </div>
  );
}
