import Link from "@/components/ui/Link";
import { ChevronRight, Info } from "lucide-react";
import { portalGate, staffOfWorkspace } from "@/lib/portalPin";
import { StaffBackBar } from "@/components/portal/StaffBackBar";
import { PortalPinScreen } from "@/components/portal/PortalPinScreen";
import { notFound } from "next/navigation";
import { LinkRevoked } from "@/components/portal/LinkRevoked";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { PortalReviewFeed } from "@/components/portal/PortalReviewFeed";
import { PortalPlanDeck } from "@/components/portal/PortalPlanDeck";
import { loadPortalClient } from "@/lib/portalData";
import { DriveGrid } from "@/components/portal/DriveGrid";
import { createAdminClient } from "@/lib/supabase/admin";

// Client-link tabs other than home and info.

export async function PortalReviewPage({ clientKey, basePath }: { clientKey: string; basePath: string }) {
  const portal = await loadPortalClient(clientKey);
  if (!portal) notFound();
  if (!portal.client.portal_enabled) return <LinkRevoked />;
  // the client's PIN (staff of this workspace skip it)
  const gate = await portalGate(portal.client);
  if (gate !== "open") return <PortalPinScreen clientKey={clientKey} clientName={portal.client.name} mode={gate} />;
  const staffView = await staffOfWorkspace(portal.client.workspace_id);
  return (
    <div className="h-[100dvh] bg-gray-950 pb-16">
      {staffView && <StaffBackBar />}
      <PortalReviewFeed clientKey={clientKey} />
      <PortalTabs basePath={basePath} active="review" badges={portal.badges} brands={portal.brands} />
    </div>
  );
}

export async function PortalPlanPage({ clientKey, basePath }: { clientKey: string; basePath: string }) {
  const portal = await loadPortalClient(clientKey);
  if (!portal) notFound();
  if (!portal.client.portal_enabled) return <LinkRevoked />;
  // the client's PIN (staff of this workspace skip it)
  const gate = await portalGate(portal.client);
  if (gate !== "open") return <PortalPinScreen clientKey={clientKey} clientName={portal.client.name} mode={gate} />;
  const staffView = await staffOfWorkspace(portal.client.workspace_id);
  const { data } = await createAdminClient()
    .from("tasks")
    .select("id, title, script_text, ref_link, content_category, revision_count")
    .eq("client_id", portal.client.id)
    .eq("type", "plan")
    .order("title");
  // plans the client already asked to change wait for the team; show the untouched ones first
  const cards = (data ?? [])
    .sort((a, b) => (a.revision_count ?? 0) - (b.revision_count ?? 0))
    .map((t) => ({ id: t.id, title: t.title, script: t.script_text, ref: t.ref_link, category: t.content_category }));
  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-28 pt-8">
      {staffView && <StaffBackBar />}
      <div className="mx-auto max-w-2xl space-y-5">
        <PortalHeader title="แผนคอนเทนต์" logo={portal.logo} subtitle={portal.client.name} />
        <PortalPlanDeck clientKey={clientKey} cards={cards} />
      </div>
      <PortalTabs basePath={basePath} active="plan" badges={portal.badges} brands={portal.brands} />
    </div>
  );
}

export async function PortalFilesPage({ clientKey, basePath }: { clientKey: string; basePath: string }) {
  const portal = await loadPortalClient(clientKey);
  if (!portal) notFound();
  if (!portal.client.portal_enabled) return <LinkRevoked />;
  // the client's PIN (staff of this workspace skip it)
  const gate = await portalGate(portal.client);
  if (gate !== "open") return <PortalPinScreen clientKey={clientKey} clientName={portal.client.name} mode={gate} />;
  const staffView = await staffOfWorkspace(portal.client.workspace_id);
  const { data } = await createAdminClient()
    .from("tasks")
    .select("id, title, type, final_url, cover_url, post_date, post_by, edit_date")
    .eq("client_id", portal.client.id)
    .in("type", ["approved", "posted"])
    .order("edit_date", { ascending: false });
  const files = data ?? [];
  const { data: counts } = await createAdminClient().from("tasks").select("type").eq("client_id", portal.client.id);
  const all = counts ?? [];
  const waiting = all.filter((t) => t.type === "pending").length;
  const planning = all.filter((t) => t.type === "plan").length;
  const posted = files.filter((t) => t.type === "posted").length;
  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-8">
      {staffView && <StaffBackBar />}
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="px-4">
          <PortalHeader title={portal.client.name} logo={portal.logo} subtitle="โปรไฟล์" />
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 text-center">
          {[["คลิปที่เสร็จ", files.length], ["โพสแล้ว", posted], ["รอตรวจ", waiting + planning]].map(([label, n]) => (
            <div key={label as string} className="rounded-2xl bg-white p-3 shadow-card">
              <p className="text-xl font-bold tabular-nums text-gray-900">{n}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="px-4">
          <Link href={`${basePath}/info`} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-card">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Info size={18} className="text-brand-500" /> ข้อมูลของฉัน · แพ็คเกจ · เอกสาร</span>
            <ChevronRight size={18} className="text-gray-300" />
          </Link>
        </div>
        <h2 className="px-4 text-sm font-semibold text-gray-700">ผลงานที่เสร็จแล้ว</h2>
        {files.length === 0 ? (
          <p className="mx-4 rounded-2xl bg-white p-10 text-center text-sm text-gray-400 shadow-card">ยังไม่มีคลิปที่อนุมัติแล้ว</p>
        ) : (
          <DriveGrid clips={files.map((t) => ({ id: t.id, title: t.title, finalUrl: t.final_url, coverUrl: t.cover_url, note: t.type === "posted" ? "โพสแล้ว · แตะเพื่อเล่น" : undefined, posted: t.type === "posted", postDate: t.post_date, postBy: t.post_by }))} postApi={staffView ? undefined : { clientKey }} />
        )}
      </div>
      <PortalTabs basePath={basePath} active="profile" badges={portal.badges} brands={portal.brands} />
    </div>
  );
}
