"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Inbox } from "lucide-react";
import { LoadingView } from "@/components/ui/LoadingView";
import { ReviewFeed, ClientAvatar, clock, unresolved, type FeedItem } from "@/components/v2/ReviewFeed";
import { getTask } from "@/lib/supabase/queries";
import { notifyTaskEvent, patchTaskWithFlow } from "@/lib/taskFlow";
import { cn } from "@/lib/utils";

type DeliverItem = FeedItem;

// New UI "ตรวจงาน": a story row of clients with drafts waiting (ALL first), then
// a TikTok-style feed of the drafts. Below the feed: clips the client approved
// that still need to go to Drive.
export default function V2ReviewPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [deliver, setDeliver] = useState<DeliverItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [tab, setTab] = useState<"review" | "deliver">("review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts/feed", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setItems(data.review);
      setDeliver(data.deliver);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const clients = useMemo(() => {
    const m = new Map<string, { item: FeedItem; count: number }>();
    for (const it of items) {
      const e = m.get(it.clientId);
      if (e) e.count += 1;
      else m.set(it.clientId, { item: it, count: 1 });
    }
    return [...m.values()];
  }, [items]);
  const shown = filter === "all" ? items : items.filter((i) => i.clientId === filter);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function pass(item: FeedItem) {
    const t = await getTask(item.taskId);
    if (!t || t.type !== "qc") {
      flash("คลิปนี้เปลี่ยนสถานะไปแล้ว");
      await load();
      return;
    }
    await patchTaskWithFlow(t, { status: "done" });
    setItems((prev) => prev.filter((i) => i.taskId !== item.taskId));
    flash("ผ่านแล้ว ส่งให้ลูกค้าตรวจ");
  }

  async function comment(item: FeedItem, at: number | null, body: string) {
    const res = await fetch("/api/drafts/comment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: item.taskId, draftId: item.draft.id, atSeconds: at, body }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return window.alert(data.error ?? "ส่งคอมเมนต์ไม่สำเร็จ");
    const text = at != null && !/^\d\d:\d\d/.test(body) ? body : body;
    setItems((prev) =>
      prev.map((i) => (i.taskId === item.taskId ? { ...i, comments: [...i.comments, { id: data.id, atSeconds: at, body: text, author: "ฉัน", fromClient: false, createdAt: data.createdAt, resolved: false }] } : i)),
    );
  }

  async function revise(item: FeedItem) {
    const open = unresolved(item.comments);
    const brief = open.map((m) => (m.atSeconds != null && !/^\d\d:\d\d/.test(m.body) ? `${clock(m.atSeconds)} ${m.body}` : m.body)).join("\n");
    const r = await notifyTaskEvent(item.taskId, "qc_revise", brief);
    if (!r.ok) return window.alert(`ส่งกลับไม่สำเร็จ: ${r.error}`);
    await fetch("/api/drafts/comment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: item.taskId }) });
    setItems((prev) => prev.filter((i) => i.taskId !== item.taskId));
    flash("ส่งกลับให้ Editor แก้แล้ว");
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-gray-950 md:h-[100dvh]">
      {/* header: tabs + story row */}
      <div className="shrink-0 space-y-2 bg-white px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">ตรวจงาน</h1>
          <div className="ml-auto grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
            <button onClick={() => setTab("review")} className={cn("rounded-md px-3 py-1.5", tab === "review" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}>
              รอ QC ({items.length})
            </button>
            <button onClick={() => setTab("deliver")} className={cn("rounded-md px-3 py-1.5", tab === "deliver" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}>
              รอส่ง Drive ({deliver.length})
            </button>
          </div>
        </div>
        {tab === "review" && clients.length > 0 && (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            <button onClick={() => setFilter("all")} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <span className={cn("rounded-full p-[3px]", filter === "all" ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600" : "bg-gray-200")}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-gray-900 text-sm font-bold text-white">ALL</span>
              </span>
              <span className="text-[11px] text-gray-700">ทั้งหมด</span>
            </button>
            {clients.map(({ item, count }) => (
              <button key={item.clientId} onClick={() => setFilter(item.clientId)} className="relative flex w-16 shrink-0 flex-col items-center gap-1">
                <span className={cn("rounded-full p-[3px]", filter === item.clientId ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600" : "bg-gray-200")}>
                  <span className="block overflow-hidden rounded-full border-2 border-white">
                    <ClientAvatar item={item} size="h-14 w-14" />
                  </span>
                </span>
                <span className="absolute right-0 top-0 min-w-5 rounded-full border-2 border-white bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{count}</span>
                <span className="w-full truncate text-[11px] text-gray-700">{item.clientName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="bg-white">
            <LoadingView />
          </div>
        ) : error ? (
          <p className="p-6 text-center text-sm text-rose-300">{error}</p>
        ) : tab === "review" ? (
          shown.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/70">
              <Inbox size={36} />
              <p className="text-sm">ไม่มีดราฟรอตรวจ</p>
              <p className="max-w-xs text-center text-xs text-white/40">Editor อัปโหลดดราฟได้จากหน้างานของคลิป แล้วคลิปจะมาขึ้นที่นี่</p>
            </div>
          ) : (
            <ReviewFeed items={shown} onPass={pass} onComment={comment} onRevise={revise} />
          )
        ) : (
          <DeliverList items={deliver} onDone={(id) => setDeliver((p) => p.filter((x) => x.taskId !== id))} />
        )}
        {toast && <span className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-lg">{toast}</span>}
      </div>
    </div>
  );
}

// Client-approved clips: download the draft, put the final on Drive, paste the link → the draft file is deleted.
function DeliverList({ items, onDone }: { items: DeliverItem[]; onDone: (taskId: string) => void }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  if (items.length === 0)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-white/70">
        <CheckCircle2 size={36} />
        <p className="text-sm">ไม่มีคลิปรอส่ง Drive</p>
      </div>
    );
  return (
    <div className="h-full space-y-3 overflow-y-auto bg-gray-50 p-4">
      <p className="text-xs text-gray-500">ลูกค้าอนุมัติแล้ว: โหลดไฟล์ → อัปเข้า Drive ของเรา → วางลิงก์ แล้วลูกค้าจะเห็นลิงก์ Final ทันที (ไฟล์ดราฟในระบบจะถูกลบ)</p>
      {items.map((it) => (
        <div key={it.taskId} className="space-y-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
          <div className="flex items-center gap-2">
            <ClientAvatar item={it} size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{it.clientName}</p>
              <p className="truncate text-xs text-gray-500">{it.title}</p>
            </div>
            {it.draft.downloadUrl && (
              <a href={it.draft.downloadUrl} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700">
                <Download size={13} /> โหลด
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <input value={links[it.taskId] ?? ""} onChange={(e) => setLinks({ ...links, [it.taskId]: e.target.value })} placeholder="วางลิงก์ Google Drive ของไฟล์ Final" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <button
              disabled={!links[it.taskId]?.trim() || busy === it.taskId}
              onClick={async () => {
                setBusy(it.taskId);
                const res = await fetch("/api/drafts/deliver", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: it.taskId, finalUrl: links[it.taskId] }) });
                const data = await res.json().catch(() => ({}));
                setBusy("");
                if (!res.ok) return window.alert(data.error ?? "บันทึกไม่สำเร็จ");
                onDone(it.taskId);
              }}
              className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy === it.taskId ? "…" : "ส่งลิงก์"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
