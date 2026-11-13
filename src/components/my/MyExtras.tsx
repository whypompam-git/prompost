"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ExternalLink, Film, FileSignature, Inbox, Palette, X } from "lucide-react";
import { ReviewFeed, type FeedItem, type FeedComment } from "@/components/v2/ReviewFeed";
import { DraftUploadButton } from "@/components/v2/DraftUploadButton";
import { driveThumb } from "@/lib/drive";
import type { MyTask } from "@/lib/myWorkTypes";
import { cn } from "@/lib/utils";

// Extra screens of "งานของฉัน" for outsourced editors: fix feed, upload sheet,
// CI Brand sheet and the Instagram-style profile.

type Ci = { logo_url: string | null; colors: { name: string; hex: string }[]; fonts: { name: string; use: string }[]; subtitle_style: string; dont: string; files: { label: string; url: string }[]; notes: string } | null;

export function CiSheet({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [data, setData] = useState<{ clientName: string; ci: Ci } | null>(null);
  useEffect(() => {
    fetch(`/api/my/ci?clientId=${clientId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ clientName: "", ci: null }));
  }, [clientId]);
  const ci = data?.ci;
  const empty = ci && !ci.colors.length && !ci.fonts.length && !ci.subtitle_style && !ci.dont && !ci.files.length && !ci.notes;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-10 sm:mx-auto sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-base font-semibold text-gray-900"><Palette size={18} /> CI Brand · {data?.clientName}</p>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400" aria-label="ปิด"><X size={18} /></button>
        </div>
        {!data ? (
          <p className="py-6 text-center text-sm text-gray-400">กำลังโหลด…</p>
        ) : !ci || empty ? (
          <p className="py-6 text-center text-sm text-gray-400">ลูกค้านี้ยังไม่มีข้อมูล CI Brand — ถามทีมได้เลย</p>
        ) : (
          <div className="space-y-4 text-sm">
            {ci.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ci.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            )}
            {ci.colors.length > 0 && (
              <section>
                <p className="mb-1.5 text-xs font-semibold text-gray-500">สี</p>
                <div className="flex flex-wrap gap-2">
                  {ci.colors.map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-lg border border-gray-100 px-2 py-1">
                      <span className="h-5 w-5 rounded" style={{ background: c.hex.startsWith("#") ? c.hex : `#${c.hex}` }} />
                      <span>{c.name}</span>
                      <span className="font-mono text-xs text-gray-400">{c.hex}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}
            {ci.fonts.length > 0 && (
              <section>
                <p className="mb-1 text-xs font-semibold text-gray-500">ฟอนต์</p>
                {ci.fonts.map((f, i) => <p key={i}><b>{f.name}</b>{f.use && <span className="text-gray-500"> · {f.use}</span>}</p>)}
              </section>
            )}
            {ci.subtitle_style && <section><p className="mb-1 text-xs font-semibold text-gray-500">สไตล์ซับไตเติล / กราฟิก</p><p className="whitespace-pre-wrap">{ci.subtitle_style}</p></section>}
            {ci.dont && <section><p className="mb-1 text-xs font-semibold text-rose-500">สิ่งที่ห้ามทำ</p><p className="whitespace-pre-wrap">{ci.dont}</p></section>}
            {ci.files.length > 0 && (
              <section>
                <p className="mb-1 text-xs font-semibold text-gray-500">ไฟล์และลิงก์</p>
                {ci.files.map((f, i) => (
                  <a key={i} href={f.url.startsWith("http") ? f.url : `https://${f.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:underline">
                    <ExternalLink size={13} /> {f.label || f.url}
                  </a>
                ))}
              </section>
            )}
            {ci.notes && <section><p className="mb-1 text-xs font-semibold text-gray-500">โน้ตสำหรับ Editor</p><p className="whitespace-pre-wrap">{ci.notes}</p></section>}
          </div>
        )}
      </div>
    </div>
  );
}

// (+) อัปดราฟ: pick one of my clips in editing / QC and upload
export function UploadSheet({ tasks, onClose, onDone }: { tasks: MyTask[]; onClose: () => void; onDone: () => void }) {
  const list = tasks.filter((t) => t.type === "edit" || t.type === "qc").sort((a, b) => (a.editDate ?? "9").localeCompare(b.editDate ?? "9"));
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white sm:mx-auto sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">อัปดราฟ — เลือกคลิป</p>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400" aria-label="ปิด"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto px-4 pb-8">
          {list.length === 0 && <p className="py-8 text-center text-sm text-gray-400">ไม่มีคลิปที่อยู่ขั้นตัดต่อตอนนี้</p>}
          {list.map((t) => (
            <div key={t.id} className="space-y-1.5 py-3">
              <p className="text-sm font-semibold text-gray-900">{t.clientName} <span className="font-normal text-gray-600">· {t.title}</span></p>
              <p className="text-[11px] text-gray-400">
                {t.type === "qc" ? "ส่งตรวจแล้ว (อัปเวอร์ชันใหม่ได้)" : t.revisionCount > 0 ? `ต้องแก้ (รอบที่ ${t.revisionCount})` : "กำลังตัดต่อ"}
                {t.editDate ? ` · ส่งภายใน ${t.editDate}` : ""}
              </p>
              <DraftUploadButton taskId={t.id} label={t.type === "edit" ? "อัปดราฟ + ส่งงาน" : "อัปเวอร์ชันใหม่"} onDone={() => { onDone(); onClose(); }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// แก้งาน: my drafts with comments as a TikTok-style feed; tick each comment when fixed
export function FixFeed({ onUploaded }: { onUploaded: () => void }) {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [ci, setCi] = useState<string | null>(null);
  const load = useCallback(() => {
    fetch("/api/my/fix", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);
  useEffect(() => load(), [load]);

  async function resolve(item: FeedItem, c: FeedComment) {
    setItems((prev) => (prev ?? []).map((i) => (i.taskId === item.taskId ? { ...i, comments: i.comments.map((m) => (m.id === c.id ? { ...m, resolved: true } : m)) } : i)));
    const res = await fetch("/api/my/comment-resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentId: c.id }) });
    if (!res.ok) load();
  }

  if (!items) return <p className="py-10 text-center text-sm text-white/60">กำลังโหลด…</p>;
  if (items.length === 0)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
        <CheckCircle2 size={36} />
        <p className="text-sm">ไม่มีงานที่ต้องแก้ตามคอมเมนต์</p>
        <p className="text-xs text-white/40">เมื่อทีมหรือลูกค้าคอมเมนต์ดราฟของคุณ จะขึ้นที่นี่พร้อมวินาทีที่ต้องแก้</p>
      </div>
    );
  return (
    <>
      <ReviewFeed items={items} variant="editor" onResolve={resolve} onOpenCi={(i) => setCi(i.clientId)} onUploaded={() => { load(); onUploaded(); }} />
      {ci && <CiSheet clientId={ci} onClose={() => setCi(null)} />}
    </>
  );
}

const MAX = 256;
function resize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const s = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * s;
        c.height = img.height * s;
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Profile = {
  name: string;
  photoUrl: string | null;
  position: string;
  done: { id: string; title: string; finalUrl: string | null; coverUrl: string | null; clientName: string }[];
  vouchers: { id: string; description: string; net: number; paidAt: string | null; token: string; signed: boolean }[];
};

// Instagram-style profile for an editor: photo, counts, contract progress,
// vouchers to sign and a grid of finished work.
export function MyProfile({ contract, inProgress }: { contract: { contractNo: string; kind: string; target: number; done: number } | null; inProgress: number }) {
  const [p, setP] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch("/api/my/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then(setP)
      .catch(() => {});
  }, []);

  async function photo(f?: File) {
    if (!f || !p) return;
    setBusy(true);
    try {
      const dataUrl = await resize(f);
      const res = await fetch("/api/my/photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      if (!res.ok) throw new Error();
      setP({ ...p, photoUrl: dataUrl });
    } catch {
      window.alert("เปลี่ยนรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!p) return <p className="py-10 text-center text-sm text-gray-400">กำลังโหลด…</p>;
  const toSign = p.vouchers.filter((v) => !v.signed);
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-5 px-1">
        <button onClick={() => file.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-100 text-2xl font-semibold text-brand-700" aria-label="เปลี่ยนรูป">
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{p.name.charAt(0)}</span>
          )}
          <span className={cn("absolute inset-0 flex items-center justify-center bg-black/40 text-white", busy ? "opacity-100" : "opacity-0 group-hover:opacity-100")}><Camera size={18} /></span>
        </button>
        <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => photo(e.target.files?.[0])} />
        <div className="grid flex-1 grid-cols-2 text-center">
          <div><p className="text-lg font-semibold tabular-nums">{p.done.length}</p><p className="text-[11px] text-gray-500">งานที่เสร็จ</p></div>
          <div><p className="text-lg font-semibold tabular-nums">{inProgress}</p><p className="text-[11px] text-gray-500">กำลังทำ</p></div>
        </div>
      </div>
      <div className="px-1">
        <p className="text-base font-semibold text-gray-900">{p.name}</p>
        {p.position && <p className="text-sm text-gray-500">{p.position}</p>}
      </div>

      {contract && contract.target > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-card">
          <p className="text-xs text-gray-400">สัญญา {contract.contractNo}</p>
          <p className="font-medium">{contract.kind === "freelance" ? "สัญญารอบนี้" : "เดือนนี้"} ผ่านแล้ว {contract.done} / {contract.target} คลิป</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.round((contract.done / contract.target) * 100))}%` }} />
          </div>
        </div>
      )}

      {toSign.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><FileSignature size={15} /> ใบสำคัญรับเงินรอคุณเซ็น ({toSign.length})</p>
          {toSign.map((v) => (
            <a key={v.id} href={`/voucher/${v.token}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
              <span className="truncate">{v.description}</span>
              <span className="shrink-0 font-semibold tabular-nums">฿{v.net.toLocaleString("th-TH")}</span>
            </a>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800"><Film size={16} /> งานที่ทำ</p>
      {p.done.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีงานที่ลูกค้าอนุมัติ</p>
      ) : (
        <div className="-mx-4 grid grid-cols-3 gap-0.5 sm:mx-0">
          {p.done.map((t) => {
            const thumb = t.coverUrl || driveThumb(t.finalUrl);
            const href = t.finalUrl ? (t.finalUrl.startsWith("http") ? t.finalUrl : `https://${t.finalUrl}`) : undefined;
            const inner = (
              <>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-gray-300"><Film size={26} /></span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-6">
                  <span className="block truncate text-[10px] font-semibold text-white">{t.clientName}</span>
                  <span className="block truncate text-[10px] text-white/80">{t.title}</span>
                </span>
              </>
            );
            return href ? (
              <a key={t.id} href={href} target="_blank" rel="noreferrer" className="relative block aspect-[9/16] overflow-hidden bg-gray-100">{inner}</a>
            ) : (
              <div key={t.id} className="relative aspect-[9/16] overflow-hidden bg-gray-100">{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { Inbox };
