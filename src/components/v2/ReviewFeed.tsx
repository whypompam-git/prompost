"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Download, Heart, MessageCircle, Palette, Send, X } from "lucide-react";
import { PALETTE, type ColorStem } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { initials } from "@/components/v2/AppGrid";
import { DraftUploadButton } from "@/components/v2/DraftUploadButton";

export type FeedComment = {
  id: string;
  atSeconds: number | null;
  body: string;
  author: string;
  fromClient: boolean;
  createdAt: string;
  resolved: boolean;
  pending?: boolean; // client side: written but not sent yet
};
export type FeedItem = {
  taskId: string;
  title: string;
  clientId: string;
  clientName: string;
  clientColor: string;
  logo: string;
  editorName: string;
  revisionCount: number;
  draft: { id: string; version: number; url?: string; downloadUrl?: string };
  comments: FeedComment[];
};

// who is watching: our team (QC), the client (approve / ask for changes) or the editor (fix comments)
export type FeedVariant = "team" | "client" | "editor";

export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const stripClock = (s: string) => s.replace(/^\d\d:\d\d\s*/, "");

function Avatar({ item, size }: { item: Pick<FeedItem, "logo" | "clientName" | "clientColor">; size: string }) {
  const stem = (item.clientColor in PALETTE ? item.clientColor : "orange") as ColorStem;
  return item.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.logo} alt="" className={cn("rounded-full bg-white object-cover", size)} />
  ) : (
    <span className={cn("flex items-center justify-center rounded-full text-xs font-bold text-white", PALETTE[stem].solid, size)}>{initials(item.clientName)}</span>
  );
}

// comments still to act on, by viewer
export function openComments(c: FeedComment[], variant: FeedVariant) {
  if (variant === "client") return c.filter((m) => m.pending);
  if (variant === "editor") return c.filter((m) => !m.resolved);
  return c.filter((m) => !m.resolved && !m.fromClient);
}
export const unresolved = (c: FeedComment[]) => openComments(c, "team");

type Handlers = {
  onPass?: (item: FeedItem) => Promise<void>;
  onComment?: (item: FeedItem, atSeconds: number | null, body: string) => Promise<void>;
  onRevise?: (item: FeedItem) => Promise<void>;
  onResolve?: (item: FeedItem, comment: FeedComment) => Promise<void>;
  onOpenCi?: (item: FeedItem) => void;
  onUploaded?: () => void;
};

// One full-screen clip, TikTok style. Hold = 2× speed. Tap the bottom area for the
// scrub bar; comments show as dots on it. The right rail depends on who watches.
function Slide({ item, active, variant, index, total, h }: { item: FeedItem; active: boolean; variant: FeedVariant; index: number; total: number; h: Handlers }) {
  const video = useRef<HTMLVideoElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [scrub, setScrub] = useState(false);
  const [panel, setPanel] = useState<"none" | "comments" | "confirm">("none");
  const [draft, setDraft] = useState("");
  const [at, setAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active && panel === "none") v.play().catch(() => {});
    else v.pause();
  }, [active, panel]);

  const open = openComments(item.comments, variant);
  const shownComments = variant === "client" ? item.comments.filter((m) => m.fromClient) : item.comments;
  const markers = shownComments.filter((m) => m.atSeconds != null && !m.resolved);

  function showComments() {
    const v = video.current;
    const t = v && v.currentTime > 0 ? v.currentTime : null;
    v?.pause();
    setAt(t);
    setDraft(t != null ? `${clock(t)} ` : "");
    setPanel("comments");
  }

  function seek(s: number) {
    const v = video.current;
    if (!v) return;
    v.currentTime = s;
    setTime(s);
  }

  const stopFast = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (video.current) video.current.playbackRate = 1;
    setFast(false);
  };

  const canWrite = variant !== "editor" && Boolean(h.onComment);
  const reviseLabel = variant === "client" ? `ส่งให้แก้ (${open.length} ข้อ)` : `ส่งกลับให้แก้ (${open.length} ข้อ)`;

  return (
    <section className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      {item.draft.url ? (
        <video
          ref={video}
          src={item.draft.url}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
          loop
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => variant === "client" && e.preventDefault()}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPause={() => setPaused(true)}
          onPlay={() => setPaused(false)}
          onClick={() => {
            const v = video.current;
            if (!v) return;
            if (v.paused) v.play().catch(() => {});
            else v.pause();
          }}
          onPointerDown={() => {
            holdTimer.current = setTimeout(() => {
              if (video.current) video.current.playbackRate = 2;
              setFast(true);
            }, 350);
          }}
          onPointerUp={stopFast}
          onPointerLeave={stopFast}
        />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">โหลดวิดีโอไม่ได้</p>
      )}

      {total > 1 && <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white">คลิปที่ {index + 1} / {total}</span>}
      {fast && <span className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">2× เร็วขึ้น</span>}
      {paused && panel === "none" && <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl text-white/80">▶</span>}

      {/* right rail */}
      <div className="absolute bottom-28 right-2 flex flex-col items-center gap-5 text-white">
        {variant === "team" ? (
          <Link href={`/v2/clients/${item.clientId}/ci`} aria-label="CI Brand ของลูกค้า">
            <Avatar item={item} size="h-12 w-12 border-2 border-white" />
          </Link>
        ) : variant === "editor" ? (
          <button onClick={() => h.onOpenCi?.(item)} className="flex flex-col items-center gap-1" aria-label="CI Brand ของลูกค้า">
            <Avatar item={item} size="h-12 w-12 border-2 border-white" />
            <span className="flex items-center gap-0.5 text-[10px] font-semibold"><Palette size={11} /> CI</span>
          </button>
        ) : (
          <Avatar item={item} size="h-12 w-12 border-2 border-white" />
        )}
        {h.onPass && (
          <button onClick={() => setPanel("confirm")} className="flex flex-col items-center gap-1" aria-label="ผ่าน">
            {variant === "client" ? <CheckCircle2 size={32} className="drop-shadow" /> : <Heart size={32} className="drop-shadow" />}
            <span className="text-[11px] font-semibold">ผ่าน</span>
          </button>
        )}
        <button onClick={showComments} className="relative flex flex-col items-center gap-1" aria-label="คอมเมนต์">
          <MessageCircle size={30} className="drop-shadow" />
          <span className="text-[11px] font-semibold">{variant === "editor" ? `${open.length} ข้อ` : open.length || "คอมเมนต์"}</span>
        </button>
        {variant === "team" && item.draft.downloadUrl && (
          <a href={item.draft.downloadUrl} className="flex flex-col items-center gap-1" aria-label="ดาวน์โหลด">
            <Download size={30} className="drop-shadow" />
            <span className="text-[11px] font-semibold">โหลด</span>
          </a>
        )}
      </div>

      {/* bottom: client (bold) + clip title; tap to reveal the scrub bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-5 pt-16 text-white" onClick={() => setScrub(true)}>
        <p className="text-sm font-bold">{item.clientName}</p>
        <p className="pr-16 text-sm leading-snug text-white/90">{item.title}</p>
        <p className="mt-0.5 text-[11px] text-white/60">
          {variant === "client" ? `ฉบับที่ ${item.draft.version}` : `ดราฟ v${item.draft.version}`}
          {variant !== "client" && item.editorName && ` · ตัดโดย ${item.editorName}`}
          {item.revisionCount > 0 && ` · แก้รอบที่ ${item.revisionCount}`}
        </p>
        <div className="relative mt-3">
          {scrub ? (
            <div className="flex items-center gap-2 text-[11px] tabular-nums">
              <span>{clock(time)}</span>
              <span className="relative flex-1">
                <input type="range" min={0} max={duration || 0} step={0.05} value={time} onChange={(e) => seek(Number(e.target.value))} className="relative z-10 h-1 w-full accent-white" aria-label="กรอคลิป" />
                {duration > 0 &&
                  markers.map((m) => (
                    <button key={m.id} onClick={(e) => { e.stopPropagation(); seek(m.atSeconds!); }} className="absolute -top-3 z-20 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white bg-amber-400" style={{ left: `${(m.atSeconds! / duration) * 100}%` }} aria-label={`คอมเมนต์ที่ ${clock(m.atSeconds!)}`} />
                  ))}
              </span>
              <span>{clock(duration)}</span>
            </div>
          ) : (
            <div className="relative h-0.5 w-full rounded bg-white/25">
              <div className="h-full rounded bg-white" style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} />
              {duration > 0 && markers.map((m) => <span key={m.id} className="absolute -top-[3px] h-2 w-2 -translate-x-1/2 rounded-full bg-amber-400" style={{ left: `${(m.atSeconds! / duration) * 100}%` }} />)}
            </div>
          )}
        </div>
      </div>

      {/* confirm pass */}
      {panel === "confirm" && h.onPass && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/50" onClick={() => setPanel("none")}>
          <div className="w-full rounded-t-2xl bg-white p-5 pb-8 text-gray-900" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold">{variant === "client" ? "อนุมัติคลิปนี้?" : "ยืนยันว่างานนี้ผ่าน QC?"}</p>
            <p className="mt-1 text-sm text-gray-500">{item.title}</p>
            <p className="mt-2 text-xs text-gray-500">{variant === "client" ? "อนุมัติแล้วย้อนกลับไม่ได้ ทีมงานจะส่งไฟล์งานจริงให้ทางลิงก์ Drive" : "คลิปจะถูกส่งไปให้ลูกค้าตรวจในลิงก์ลูกค้า"}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setPanel("none")} className="rounded-xl border border-gray-200 py-3 text-sm font-medium">ยกเลิก</button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await h.onPass!(item);
                  } finally {
                    setBusy(false);
                    setPanel("none");
                  }
                }}
                className={cn("rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50", variant === "client" ? "bg-emerald-500" : "bg-rose-500")}
              >
                {busy ? "กำลังส่ง…" : variant === "client" ? "อนุมัติ" : "ผ่าน ส่งให้ลูกค้า"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* comments sheet */}
      {panel === "comments" && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/40" onClick={() => setPanel("none")}>
          <div className="flex max-h-[75%] w-full flex-col rounded-t-2xl bg-white text-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold">{variant === "editor" ? "สิ่งที่ต้องแก้" : "คอมเมนต์"} ({shownComments.length})</p>
              <button onClick={() => setPanel("none")} className="rounded-full p-1 text-gray-400" aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {shownComments.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400">{variant === "client" ? "เล่นคลิปแล้วกดคอมเมนต์ตรงจุดที่อยากให้แก้ ระบบใส่วินาทีให้เอง" : "ยังไม่มีคอมเมนต์"}</p>
              )}
              {shownComments.map((m) => (
                <div key={m.id} className={cn("flex items-start gap-2 text-sm", m.resolved && "opacity-50")}>
                  {variant === "editor" && (
                    <button
                      onClick={() => !m.resolved && h.onResolve?.(item, m)}
                      className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", m.resolved ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300")}
                      aria-label={m.resolved ? "แก้แล้ว" : "ติ๊กว่าแก้แล้ว"}
                    >
                      {m.resolved && <Check size={12} />}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">
                      {variant !== "client" && <b className="text-gray-700">{m.author}</b>}
                      {variant !== "client" && m.fromClient && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">ลูกค้า</span>}
                      {m.pending && <span className="text-amber-600">ยังไม่ได้ส่ง</span>}
                      {m.resolved && " · แก้แล้ว"}
                    </p>
                    <p>
                      {m.atSeconds != null && (
                        <button
                          onClick={() => {
                            seek(m.atSeconds!);
                            setPanel("none");
                          }}
                          className="mr-1 font-semibold text-brand-600"
                        >
                          {clock(m.atSeconds)}
                        </button>
                      )}
                      {stripClock(m.body)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {variant === "editor" ? (
              <div className="border-t border-gray-100 px-4 py-3">
                <DraftUploadButton taskId={item.taskId} label="อัปเวอร์ชันใหม่ที่แก้แล้ว" onDone={h.onUploaded} className="w-full justify-center" />
              </div>
            ) : (
              <>
                {open.length > 0 && h.onRevise && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await h.onRevise!(item);
                        setPanel("none");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="mx-4 mb-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {reviseLabel}
                  </button>
                )}
                {canWrite && (
                  <form
                    className="flex items-center gap-2 border-t border-gray-100 px-3 py-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!draft.trim()) return;
                      setBusy(true);
                      try {
                        await h.onComment!(item, at, draft.trim());
                        setDraft("");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={variant === "client" ? "อยากให้แก้ตรงไหน…" : "คอมเมนต์ถึง Editor…"} className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                    <button disabled={busy || !draft.trim()} className="rounded-full bg-brand-500 p-2.5 text-white disabled:opacity-40" aria-label="เพิ่มคอมเมนต์">
                      <Send size={16} />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// Vertical snap-scrolling feed; the slide in view plays, the others pause.
export function ReviewFeed({ items, variant = "team", ...h }: { items: FeedItem[]; variant?: FeedVariant } & Handlers) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root: el, threshold: [0.6] },
    );
    el.querySelectorAll<HTMLElement>("[data-i]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [items]);

  return (
    <div ref={box} className="h-full snap-y snap-mandatory overflow-y-auto">
      {items.map((it, i) => (
        <div key={`${it.taskId}-${it.draft.id}`} data-i={i} className="h-full">
          <Slide item={it} active={i === active} variant={variant} index={i} total={items.length} h={h} />
        </div>
      ))}
    </div>
  );
}

export { Avatar as ClientAvatar };
