"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Heart, MessageCircle, Send, X } from "lucide-react";
import { PALETTE, type ColorStem } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { initials } from "@/components/v2/AppGrid";

export type FeedComment = { id: string; atSeconds: number | null; body: string; author: string; fromClient: boolean; createdAt: string; resolved: boolean };
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

export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Avatar({ item, size }: { item: Pick<FeedItem, "logo" | "clientName" | "clientColor">; size: string }) {
  const stem = (item.clientColor in PALETTE ? item.clientColor : "orange") as ColorStem;
  return item.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.logo} alt="" className={cn("rounded-full bg-white object-cover", size)} />
  ) : (
    <span className={cn("flex items-center justify-center rounded-full text-xs font-bold text-white", PALETTE[stem].solid, size)}>{initials(item.clientName)}</span>
  );
}

// One full-screen clip, TikTok style. Right rail: client (→ CI Brand), ♥ = pass,
// 💬 = comment at the current second, ⬇ = download. Hold = 2× speed. Tap the
// bottom area to show the scrub bar.
function Slide({
  item,
  active,
  onPass,
  onComment,
  onRevise,
}: {
  item: FeedItem;
  active: boolean;
  onPass: (item: FeedItem) => Promise<void>;
  onComment: (item: FeedItem, atSeconds: number | null, body: string) => Promise<void>;
  onRevise: (item: FeedItem) => Promise<void>;
}) {
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

  const open = unresolved(item.comments);

  function openComments() {
    const v = video.current;
    const t = v ? v.currentTime : null;
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
          onPointerUp={() => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            if (video.current) video.current.playbackRate = 1;
            setFast(false);
          }}
          onPointerLeave={() => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            if (video.current) video.current.playbackRate = 1;
            setFast(false);
          }}
        />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">โหลดวิดีโอไม่ได้</p>
      )}

      {fast && <span className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">2× เร็วขึ้น</span>}
      {paused && panel === "none" && <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl text-white/80">▶</span>}

      {/* right rail */}
      <div className="absolute bottom-28 right-2 flex flex-col items-center gap-5 text-white">
        <Link href={`/v2/clients/${item.clientId}/ci`} className="flex flex-col items-center gap-1" aria-label="CI Brand ของลูกค้า">
          <Avatar item={item} size="h-12 w-12 border-2 border-white" />
        </Link>
        <button onClick={() => setPanel("confirm")} className="flex flex-col items-center gap-1" aria-label="งานผ่าน">
          <Heart size={32} className="drop-shadow" />
          <span className="text-[11px] font-semibold">ผ่าน</span>
        </button>
        <button onClick={openComments} className="flex flex-col items-center gap-1" aria-label="คอมเมนต์">
          <MessageCircle size={30} className="drop-shadow" />
          <span className="text-[11px] font-semibold">{open.length || "คอมเมนต์"}</span>
        </button>
        {item.draft.downloadUrl && (
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
          ดราฟ v{item.draft.version}
          {item.editorName && ` · ตัดโดย ${item.editorName}`}
          {item.revisionCount > 0 && ` · แก้รอบที่ ${item.revisionCount}`}
        </p>
        <div className={cn("mt-3 transition-all", scrub ? "opacity-100" : "pointer-events-none h-1 opacity-60")}>
          {scrub ? (
            <div className="flex items-center gap-2 text-[11px] tabular-nums">
              <span>{clock(time)}</span>
              <input type="range" min={0} max={duration || 0} step={0.05} value={time} onChange={(e) => seek(Number(e.target.value))} className="h-1 flex-1 accent-white" aria-label="กรอคลิป" />
              <span>{clock(duration)}</span>
            </div>
          ) : (
            <div className="h-0.5 w-full rounded bg-white/25">
              <div className="h-full rounded bg-white" style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} />
            </div>
          )}
        </div>
      </div>

      {/* confirm pass */}
      {panel === "confirm" && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/50" onClick={() => setPanel("none")}>
          <div className="w-full rounded-t-2xl bg-white p-5 pb-8 text-gray-900" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold">ยืนยันว่างานนี้ผ่าน QC?</p>
            <p className="mt-1 text-sm text-gray-500">{item.clientName} · {item.title}</p>
            <p className="mt-2 text-xs text-gray-500">คลิปจะถูกส่งไปให้ลูกค้าตรวจในลิงก์ลูกค้า</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setPanel("none")} className="rounded-xl border border-gray-200 py-3 text-sm font-medium">ยกเลิก</button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onPass(item);
                  } finally {
                    setBusy(false);
                    setPanel("none");
                  }
                }}
                className="rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "กำลังส่ง…" : "ผ่าน ส่งให้ลูกค้า"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* comments sheet */}
      {panel === "comments" && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/40" onClick={() => setPanel("none")}>
          <div className="flex max-h-[70%] w-full flex-col rounded-t-2xl bg-white text-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold">คอมเมนต์ ({item.comments.length})</p>
              <button onClick={() => setPanel("none")} className="rounded-full p-1 text-gray-400" aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {item.comments.length === 0 && <p className="py-4 text-center text-sm text-gray-400">ยังไม่มีคอมเมนต์</p>}
              {item.comments.map((m) => (
                <div key={m.id} className={cn("text-sm", m.resolved && "opacity-50")}>
                  <p className="text-xs text-gray-400">
                    <b className="text-gray-700">{m.author}</b>
                    {m.fromClient && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">ลูกค้า</span>}
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
                    {m.body.replace(/^\d\d:\d\d\s*/, "")}
                  </p>
                </div>
              ))}
            </div>
            {open.length > 0 && (
              <button
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm(`ส่งกลับให้ Editor แก้ตามคอมเมนต์ ${open.length} ข้อ?`)) return;
                  setBusy(true);
                  try {
                    await onRevise(item);
                    setPanel("none");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mx-4 mb-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                ส่งกลับให้แก้ ({open.length} ข้อ)
              </button>
            )}
            <form
              className="flex items-center gap-2 border-t border-gray-100 px-3 py-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                setBusy(true);
                try {
                  await onComment(item, at, draft.trim());
                  setDraft("");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="คอมเมนต์ถึง Editor…" className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <button disabled={busy || !draft.trim()} className="rounded-full bg-brand-500 p-2.5 text-white disabled:opacity-40" aria-label="ส่งคอมเมนต์">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export const unresolved = (c: FeedComment[]) => c.filter((m) => !m.resolved && !m.fromClient);

// Vertical snap-scrolling feed; the slide in view plays, the others pause.
export function ReviewFeed({ items, onPass, onComment, onRevise }: { items: FeedItem[]; onPass: (i: FeedItem) => Promise<void>; onComment: (i: FeedItem, at: number | null, body: string) => Promise<void>; onRevise: (i: FeedItem) => Promise<void> }) {
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
          <Slide item={it} active={i === active} onPass={onPass} onComment={onComment} onRevise={onRevise} />
        </div>
      ))}
    </div>
  );
}

export { Avatar as ClientAvatar };
