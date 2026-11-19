"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { clearMemo } from "@/lib/offline/cache";
import { lastUndo, subscribeUndo, undoLast } from "@/lib/undo";

const SHOW_MS = 10_000;

// "เลิกทำ" for the last change to a clip: a bar that shows for 10 seconds after each change,
// and Ctrl/Cmd+Z anywhere outside a text box. The page reloads after an undo so every screen
// shows the restored values.
export function UndoBar() {
  const last = useSyncExternalStore(subscribeUndo, () => lastUndo()?.id ?? 0, () => 0);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!last) return setVisible(false);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [last]);

  async function run() {
    if (busy || !lastUndo()) return;
    setBusy(true);
    try {
      const e = await undoLast();
      if (e) {
        setDone(`เลิกทำแล้ว: ${e.label}`);
        clearMemo();
        setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      window.alert("เลิกทำไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (!(ev.metaKey || ev.ctrlKey) || ev.shiftKey || ev.key.toLowerCase() !== "z") return;
      const el = ev.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (!lastUndo()) return;
      ev.preventDefault();
      void run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const entry = lastUndo();
  if (done) return <Bar text={done} />;
  if (!visible || !entry) return null;
  return <Bar text={entry.label} action={<button onClick={run} disabled={busy} className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900 disabled:opacity-60">{busy ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} เลิกทำ</button>} />;
}

function Bar({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="fixed inset-x-3 bottom-20 z-[60] flex justify-center md:bottom-6">
      <div className="flex max-w-md items-center gap-3 rounded-full bg-gray-900/95 py-2 pl-4 pr-2 text-sm text-white shadow-lg">
        <span className="min-w-0 truncate">{text}</span>
        {action}
      </div>
    </div>
  );
}
