import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
      <p className="text-sm text-gray-700">
        <span className="text-gray-400">{label}: </span>
        <span className="whitespace-pre-wrap">{value}</span>
      </p>
    ) : null;
  const Link = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <p className="text-sm">
        <span className="text-gray-400">{label}: </span>
        <a href={withScheme(value)} target="_blank" rel="noreferrer" className="break-all text-brand-600 underline">{value}</a>
      </p>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 print:bg-white print:py-2">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pack.title}</h1>
            <p className="text-sm text-gray-500">รายชื่อ MC ที่เสนอ {list.length} คน</p>
          </div>
          <PrintButton />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
          {list.map((m) => {
            const photos = [...(m.extra_photos ?? []), ...(m.photo_url ? [m.photo_url] : [])];
            return (
              <div key={m.id} className="break-inside-avoid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex gap-4 p-4">
                  <div className="w-32 shrink-0">
                    {photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photos[0]} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
                    ) : (
                      <div className="aspect-[3/4] w-full rounded-xl bg-gray-100" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-lg font-semibold text-gray-900">{m.nickname}</h2>
                    {show.rate && m.rate_offer ? <p className="text-sm font-semibold text-brand-700">{baht(Number(m.rate_offer))} / คิว (3 ชม.)</p> : null}
                    {show.age && <Line label="อายุ" value={m.age} />}
                    {show.height && <Line label="ส่วนสูง" value={m.height} />}
                    {show.weight && <Line label="น้ำหนัก" value={m.weight} />}
                    {show.character && <Line label="สไตล์" value={m.character} />}
                    {show.skills && <Line label="ความสามารถ" value={m.skills} />}
                    {show.experience && <Line label="ประสบการณ์" value={m.experience} />}
                    {show.portfolio && <Link label="ผลงาน" value={m.portfolio} />}
                    {show.ig && <Link label="IG" value={m.ig} />}
                    {show.facebook && <Link label="Facebook" value={m.facebook} />}
                  </div>
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto px-4 pb-4">
                    {photos.slice(1, 6).map((u) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={u} src={u} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
