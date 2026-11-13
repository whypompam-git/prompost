import { notFound } from "next/navigation";
import { Film } from "lucide-react";
import { LinkRevoked } from "@/components/portal/LinkRevoked";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { PortalReviewFeed } from "@/components/portal/PortalReviewFeed";
import { PortalPlanDeck } from "@/components/portal/PortalPlanDeck";
import { loadPortalClient } from "@/lib/portalData";
import { driveThumb } from "@/lib/drive";
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
          <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4">
            {files.map((t) => {
              const thumb = t.cover_url || driveThumb(t.final_url);
              const href = t.final_url ? (t.final_url.startsWith("http") ? t.final_url : `https://${t.final_url}`) : undefined;
              const Tile = (
                <>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-gray-300">
                      <Film size={26} />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-6">
                    <span className="block truncate text-[10px] font-medium text-white">{t.title}</span>
                    <span className="block text-[10px] text-white/70">{t.type === "posted" ? "โพสแล้ว" : href ? "แตะเพื่อเปิดไฟล์" : "กำลังเตรียมไฟล์"}</span>
                  </span>
                </>
              );
              return href ? (
                <a key={t.id} href={href} target="_blank" rel="noreferrer" className="relative block aspect-[9/16] overflow-hidden bg-gray-200">
                  {Tile}
                </a>
              ) : (
                <div key={t.id} className="relative aspect-[9/16] overflow-hidden bg-gray-200">
                  {Tile}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <PortalTabs basePath={basePath} active="files" badges={portal.badges} />
    </div>
  );
}
