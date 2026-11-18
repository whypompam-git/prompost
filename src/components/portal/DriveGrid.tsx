"use client";

import { useState } from "react";
import { Check, Download, ExternalLink, Film, X } from "lucide-react";
import { SOCIAL_LABEL, driveDownload, drivePreview, driveThumb, socialEmbed, socialKind } from "@/lib/drive";

export type DriveClip = { id: string; title: string; subtitle?: string; finalUrl: string | null; coverUrl: string | null; note?: string; posted?: boolean; postDate?: string | null; postBy?: string | null };

const withScheme = (u: string) => (u.startsWith("http") ? u : `https://${u}`);

// Instagram-style grid of finished clips. Tapping one plays it right here (Drive's
// player) with download and "open in Drive" buttons.
export function DriveGrid({ clips, postApi }: { clips: DriveClip[]; postApi?: { clientKey: string } }) {
  const [open, setOpen] = useState<DriveClip | null>(null);
  const [dates, setDates] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const postOf = (c: DriveClip) => (c.id in dates ? dates[c.id] : c.postDate) ?? null;
  async function savePostDate(c: DriveClip, value: string | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/portal/post-date", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientKey: postApi!.clientKey, taskId: c.id, postDate: value }) });
      if (!res.ok) throw new Error();
      setDates((p) => ({ ...p, [c.id]: value }));
    } catch {
      window.alert("บันทึกวันโพสไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }
  const social = open ? socialKind(open.finalUrl) : undefined;
  const preview = open ? (drivePreview(open.finalUrl) ?? socialEmbed(open.finalUrl)) : undefined;
  const download = open ? driveDownload(open.finalUrl) : undefined;

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4">
        {clips.map((t) => {
          const thumb = t.coverUrl || driveThumb(t.finalUrl);
          return (
            <button key={t.id} onClick={() => t.finalUrl && setOpen(t)} disabled={!t.finalUrl} className="relative block aspect-[9/16] overflow-hidden bg-gray-200 text-left">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300">
                  <Film size={26} />
                  {socialKind(t.finalUrl) && <span className="text-[10px] font-semibold text-gray-400">{SOCIAL_LABEL[socialKind(t.finalUrl)!]}</span>}
                </span>
              )}
              {t.posted && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow ring-1 ring-white/70" title="โพสแล้ว">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              {!t.posted && postOf(t) && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-sky-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  โพส {new Date(postOf(t)!).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-6">
                {t.subtitle && <span className="block truncate text-[10px] font-semibold text-white">{t.subtitle}</span>}
                <span className="block truncate text-[10px] text-white">{t.title}</span>
                <span className="block text-[10px] text-white/70">{t.note ?? (t.finalUrl ? "แตะเพื่อเล่น" : "กำลังเตรียมไฟล์")}</span>
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <button onClick={() => setOpen(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="ปิด"><X size={22} /></button>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{open.title}</p>
          </div>
          <div className="min-h-0 flex-1">
            {preview ? (
              <iframe src={preview} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen title={open.title} />
            ) : (
              <p className="p-6 text-center text-sm text-white/70">{social ? `ลิงก์ ${SOCIAL_LABEL[social]} นี้เล่นในหน้านี้ไม่ได้` : "ลิงก์นี้ไม่ใช่ไฟล์ Google Drive"} — เปิดดูจากปุ่มด้านล่าง</p>
            )}
          </div>
          {postApi && !open.posted && (
            <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white">
              <span className="font-semibold">วันที่จะโพส</span>
              <input
                type="date"
                disabled={saving}
                value={postOf(open) ?? ""}
                onChange={(e) => savePostDate(open, e.target.value || null)}
                className="rounded-lg border border-white/30 bg-white px-2 py-1 text-sm text-gray-900"
              />
              <span className="text-white/60">{postOf(open) ? "ทีมงานเห็นวันนี้แล้ว" : "ยังไม่ได้ตั้ง (ลูกค้าตั้งวันเองได้)"}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {download ? (
              <a href={download} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-semibold text-gray-900"><Download size={16} /> ดาวน์โหลด</a>
            ) : (
              <span />
            )}
            <a href={withScheme(open.finalUrl!)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 py-3 text-sm font-semibold text-white"><ExternalLink size={16} /> {social ? `เปิดใน ${SOCIAL_LABEL[social]}` : "เปิดใน Drive"}</a>
          </div>
          <p className="pb-3 text-center text-[11px] text-white/40">{social ? "ถ้าเล่นไม่ได้ โพสต์ต้องตั้งเป็นสาธารณะ" : "ถ้าเล่นไม่ได้ ไฟล์ใน Drive ต้องตั้งเป็น “ทุกคนที่มีลิงก์ดูได้”"}</p>
        </div>
      )}
    </>
  );
}
