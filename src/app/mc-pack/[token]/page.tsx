import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { McCarousel } from "@/components/mc/McCarousel";
import { PrintButton } from "@/components/mc/PrintButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { baht, withScheme } from "@/lib/mcDisplay";
import { isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata: Metadata = { title: "ข้อเสนอ MC", robots: { index: false, follow: false } };

// Public, token-protected proposal for a client. Only the fields the pack's
// "show" list allows are rendered; real name, phone and Line ID are never read here.
export default async function McPackPage({ params }: { params: { token: string } }) {
  if (!isUuid(params.token)) notFound();
  const db = createAdminClient();
  const { data: pack } = await db.from("mc_packs").select("title, mc_ids, show, enabled").eq("share_token", params.token).maybeSingle();
  if (!pack || !pack.enabled) notFound();

  const { data: rows } = await db
    .from("mc_profiles")
    .select("id, nickname, age, height, weight, character, skills, experience, portfolio, ig, facebook, photo_url, extra_photos, rate_offer, hidden")
    .in("id", pack.mc_ids);
  const order = new Map((pack.mc_ids as string[]).map((id, i) => [id, i]));
  const list = (rows ?? []).filter((r) => !r.hidden).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const show = (pack.show ?? {}) as Record<string, boolean>;

  const Line = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <p className="text-sm leading-snug text-gray-700">
        <span className="text-gray-400">{label}: </span>
        <span className="whitespace-pre-wrap">{value}</span>
      </p>
    ) : null;
  // links are small buttons (not long URLs) to save space
  const LinkBtn = ({ label, href }: { label: string; href?: string | null }) =>
    href ? (
      <a href={withScheme(href)} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100">
        {label} ↗
      </a>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 print:bg-white print:py-2">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pack.title}</h1>
            <p className="text-sm text-gray-500">รายชื่อ MC ที่เสนอ {list.length} คน</p>
          </div>
          <PrintButton />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
          {list.map((m) => {
            const photos = [...(m.extra_photos ?? []), ...(m.photo_url ? [m.photo_url] : [])];
            return (
              <div key={m.id} className="break-inside-avoid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <McCarousel photos={photos} />
                <div className="space-y-1.5 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{m.nickname}</h2>
                    {show.rate && m.rate_offer ? <p className="shrink-0 text-sm font-semibold text-brand-700">{baht(Number(m.rate_offer))} / คิว (3 ชม.)</p> : null}
                  </div>
                  {(show.age || show.height || show.weight) && (
                    <p className="text-sm text-gray-500">
                      {[show.age && m.age && `${m.age} ปี`, show.height && m.height && `สูง ${m.height}`, show.weight && m.weight && `หนัก ${m.weight}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {show.character && <Line label="สไตล์" value={m.character} />}
                  {show.skills && <Line label="ความสามารถ" value={m.skills} />}
                  {show.experience && <Line label="ประสบการณ์" value={m.experience} />}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {show.portfolio && <LinkBtn label="ผลงาน" href={m.portfolio} />}
                    {show.ig && <LinkBtn label="Instagram" href={m.ig} />}
                    {show.facebook && <LinkBtn label="Facebook" href={m.facebook} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
