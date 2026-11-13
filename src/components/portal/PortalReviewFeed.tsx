"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { ReviewFeed, clock, type FeedComment, type FeedItem } from "@/components/v2/ReviewFeed";

// The client's "ตรวจงาน": clips waiting for them as a TikTok-style feed. ✓ = approve,
// 💬 = note what to change at the second it plays (several notes, then send once).
export function PortalReviewFeed({ clientKey }: { clientKey: string }) {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/drafts?clientKey=${encodeURIComponent(clientKey)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, [clientKey]);
  useEffect(() => {
    load();
  }, [load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  };

  async function act(item: FeedItem, action: "pass" | "revise", extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/portal/task-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientKey, taskId: item.taskId, action, ...extra }) });
    if (!res.ok) {
      window.alert(res.status === 409 ? "สถานะงานเปลี่ยนไปแล้ว กรุณารีเฟรชหน้านี้" : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
      return false;
    }
    setItems((prev) => (prev ?? []).filter((i) => i.taskId !== item.taskId));
    return true;
  }

  async function pass(item: FeedItem) {
    if (await act(item, "pass")) flash("อนุมัติเรียบร้อย ขอบคุณค่ะ");
  }

  // notes stay on this device until "ส่งให้แก้"
  async function comment(item: FeedItem, at: number | null, body: string) {
    const note: FeedComment = { id: `local-${Date.now()}`, atSeconds: at, body, author: "คุณ", fromClient: true, createdAt: new Date().toISOString(), resolved: false, pending: true };
    setItems((prev) => (prev ?? []).map((i) => (i.taskId === item.taskId ? { ...i, comments: [...i.comments, note] } : i)));
  }

  async function revise(item: FeedItem) {
    const notes = item.comments.filter((c) => c.pending);
    if (!notes.length) return;
    const comments = notes.map((n) => ({ atSeconds: n.atSeconds, body: n.atSeconds != null && !/^\d\d:\d\d/.test(n.body) ? `${clock(n.atSeconds)} ${n.body}` : n.body }));
    const brief = comments.map((c) => c.body).join("\n");
    if (await act(item, "revise", { brief, comments, draftId: item.draft.id })) flash("ส่งให้ทีมแก้แล้ว ทีมงานจะส่งฉบับใหม่ให้ตรวจอีกครั้ง");
  }

  if (error) return <p className="p-6 text-center text-sm text-rose-300">{error}</p>;
  if (!items) return <p className="p-6 text-center text-sm text-white/60">กำลังโหลด…</p>;

  return (
    <div className="relative h-full">
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
          <Inbox size={36} />
          <p className="text-sm">ไม่มีคลิปรอคุณตรวจตอนนี้</p>
          <p className="text-xs text-white/40">เมื่อทีมงานส่งคลิปมาให้ตรวจ จะขึ้นที่หน้านี้</p>
        </div>
      ) : (
        <ReviewFeed items={items} variant="client" onPass={pass} onComment={comment} onRevise={revise} />
      )}
      {toast && <span className="absolute left-1/2 top-4 z-20 w-max max-w-[90%] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-gray-900 shadow-lg">{toast}</span>}
    </div>
  );
}
