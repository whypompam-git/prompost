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
  return (
    <div className="h-[100dvh] bg-gray-950 pb-16">
      <PortalReviewFeed clientKey={clientKey} />
      <PortalTabs basePath={basePath} active="review" badges={portal.badges} />
    </div>
  );
}

export async function PortalPlanPage({ clientKey, basePath }: { clientKey: string; basePath: string }) {
  const portal = await loadPortalClient(clientKey);
  if (!portal) notFound();
  if (!portal.client.portal_enabled) return <LinkRevoked />;
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
      <div className="mx-auto max-w-2xl space-y-5">
        <PortalHeader title="แผนคอนเทนต์" logo={portal.logo} subtitle={portal.client.name} />
        <PortalPlanDeck clientKey={clientKey} cards={cards} />
      </div>
      <PortalTabs basePath={basePath} active="plan" badges={portal.badges} />
    </div>
  );
}

export async function PortalFilesPage({ clientKey, basePath }: { clientKey: string; basePath: string }) {
  const portal = await loadPortalClient(clientKey);
  if (!portal) notFound();
  if (!portal.client.portal_enabled) return <LinkRevoked />;
  const { data } = await createAdminClient()
    .from("tasks")
    .select("id, title, type, final_url, cover_url, post_date, edit_date")
    .eq("client_id", portal.client.id)
    .in("type", ["approved", "posted"])
    .order("edit_date", { ascending: false });
  const files = data ?? [];
  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="px-4">
          <PortalHeader title="ไฟล์งาน" logo={portal.logo} subtitle={`${portal.client.name} · ${files.length} คลิป`} />
        </div>
        {files.length === 0 ? (
          <p className="mx-4 rounded-2xl bg-white p-10 text-center text-sm text-gray-400 shadow-card">ยังไม่มีคลิปที่อนุมัติแล้ว</p>
        ) : (
          <DriveGrid clips={files.map((t) => ({ id: t.id, title: t.title, finalUrl: t.final_url, coverUrl: t.cover_url, note: t.type === "posted" ? "โพสแล้ว · แตะเพื่อเล่น" : undefined }))} />
        )}
      </div>
      <PortalTabs basePath={basePath} active="files" badges={portal.badges} />
    </div>
  );
}
