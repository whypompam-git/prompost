"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Minus, Plus, Send, Users, X } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { ScriptText } from "@/components/ui/ScriptText";
import { listQueues, listStaff, listTasksForClient, updateTaskRow } from "@/lib/supabase/queries";
import { patchTaskWithFlow } from "@/lib/taskFlow";
import type { Queue, Staff, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useV2Client } from "../useV2Client";

const SIZE_KEY = "prompost:prompter-size";
const shotDone = (t: Task) => (t.type === "shoot" && t.status === "done") || ["edit", "qc", "pending", "approved", "posted"].includes(t.type);
const byOrder = (a: Task, b: Task) => (a.shootOrder ?? 999) - (b.shootOrder ?? 999) || a.title.localeCompare(b.title, "th", { numeric: true });
const thDate = (iso?: string) => (iso ? new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" }) : "ยังไม่มีวันถ่าย");

// New UI "การถ่าย": for the shoot itself. Each queue is a list of clip cards with a
// shooting-order number; tap a card for a big-print teleprompter, then "ถ่ายเสร็จ".
// When the queue is done, send a summary to the team LINE group.
export default function V2ShootPage() {
  const { id, client } = useV2Client();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [open, setOpen] = useState<{ queueId: string; taskId: string } | null>(null);
  const [summary, setSummary] = useState<{ text: string; sent: number } | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    Promise.all([listTasksForClient(id), listQueues(id), listStaff().catch(() => [] as Staff[])]).then(([t, q, s]) => {
      setTasks(t);
      setQueues(q);
      setStaff(s);
    });
  }, [id]);

  // queues that still have clips to shoot (or shot today), newest shoot date first
  const groups = useMemo(() => {
    if (!tasks) return [];
    return queues
      .map((q) => ({ queue: q, clips: tasks.filter((t) => t.queueId === q.id && (t.type === "shoot" || shotDone(t))).sort(byOrder) }))
      .filter((g) => g.clips.some((t) => t.type === "shoot"))
      .sort((a, b) => (a.queue.shootDate ?? "9").localeCompare(b.queue.shootDate ?? "9"));
  }, [tasks, queues]);

  function patchLocal(taskId: string, fields: Partial<Task>) {
    setTasks((prev) => (prev ?? []).map((t) => (t.id === taskId ? { ...t, ...fields } : t)));
  }

  async function setOrder(t: Task, value: string) {
    const n = value === "" ? null : Math.max(1, Math.min(999, Math.floor(Number(value))));
    if (n === t.shootOrder || Number.isNaN(n)) return;
    patchLocal(t.id, { shootOrder: n });
    await updateTaskRow(t.id, { shootOrder: n }).catch(() => window.alert("บันทึกลำดับไม่สำเร็จ"));
  }

  async function markShot(t: Task) {
    setBusy(t.id);
    try {
      const saved = await patchTaskWithFlow(t, { status: "done" });
      patchLocal(t.id, saved);
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy("");
    }
  }

  async function sendSummary(queueId: string) {
    setBusy(queueId);
    try {
      const res = await fetch("/api/queues/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ queueId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary({ text: data.text, sent: data.sent });
    } catch (e) {
      window.alert(e instanceof Error && e.message ? e.message : "ส่งสรุปไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  if (!tasks) return (<><Topbar back={`/v2/clients/${id}`} title="การถ่าย" /><LoadingView /></>);

  const openGroup = open ? groups.find((g) => g.queue.id === open.queueId) : undefined;
  const crew = (q: Queue) => q.crew.map((sid) => staff.find((s) => s.id === sid)?.name).filter(Boolean).join(", ");

  return (
    <>
      <Topbar back={`/v2/clients/${id}`} title="การถ่าย" subtitle={client?.name} />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {groups.length === 0 && (
          <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
            ไม่มีคิวที่รอถ่าย — จัดคลิปเข้าคิวได้ที่หน้าคอนเทนต์ของลูกค้า
          </p>
        )}
        {groups.map(({ queue, clips }) => {
          const done = clips.filter(shotDone).length;
          return (
            <section key={queue.id} className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{queue.name}</h2>
                  <p className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><CalendarDays size={12} /> {thDate(queue.shootDate)}</span>
                    {queue.crew.length > 0 && <span className="flex items-center gap-1"><Users size={12} /> {crew(queue)}</span>}
                    <span className="font-medium text-gray-700">ถ่ายแล้ว {done}/{clips.length}</span>
                  </p>
                </div>
                <button
                  onClick={() => sendSummary(queue.id)}
                  disabled={busy === queue.id || done === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Send size={14} /> {busy === queue.id ? "กำลังส่ง…" : "สรุปคิว ส่ง LINE"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {clips.map((t) => (
                  <div key={t.id} className={cn("flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-card", shotDone(t) ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100")}>
                    <input
                      type="number"
                      inputMode="numeric"
                      defaultValue={t.shootOrder ?? ""}
                      onBlur={(e) => setOrder(t, e.target.value)}
                      placeholder="#"
                      aria-label="ลำดับถ่าย"
                      className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <button onClick={() => setOpen({ queueId: queue.id, taskId: t.id })} className="min-w-0 flex-1 text-left">
                      <p className="text-base font-semibold leading-snug text-gray-900">{t.title}</p>
                      <p className={cn("text-xs", shotDone(t) ? "text-emerald-600" : "text-gray-400")}>{shotDone(t) ? "✓ ถ่ายแล้ว" : "แตะเพื่อเปิดสคริปต์"}</p>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {open && openGroup && (
        <Prompter
          clips={openGroup.clips}
          startId={open.taskId}
          busyId={busy}
          onShot={markShot}
          onClose={() => setOpen(null)}
        />
      )}

      {summary && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setSummary(null)}>
          <div className="w-full rounded-t-2xl bg-white p-5 pb-10 sm:mx-auto sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold text-gray-900">{summary.sent ? `ส่งเข้า LINE กลุ่มแล้ว (${summary.sent} กลุ่ม)` : "ยังไม่ได้ส่ง LINE (ไม่มีช่อง LINE ที่รับหัวข้องาน)"}</p>
            <pre className="mt-3 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-800">{summary.text}</pre>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(summary.text).then(() => window.alert("คัดลอกแล้ว")).catch(() => {})}
                className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
              >
                คัดลอกข้อความ
              </button>
              <button onClick={() => setSummary(null)} className="rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Big-print script for the set: font size A−/A+ (remembered), next/previous clip,
// and "ถ่ายเสร็จ" at the end of the script.
function Prompter({ clips, startId, busyId, onShot, onClose }: { clips: Task[]; startId: string; busyId: string; onShot: (t: Task) => Promise<void>; onClose: () => void }) {
  const [idx, setIdx] = useState(Math.max(0, clips.findIndex((c) => c.id === startId)));
  const [size, setSize] = useState(28);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(SIZE_KEY));
      if (v >= 16 && v <= 64) setSize(v);
    } catch {}
  }, []);
  function resize(d: number) {
    const n = Math.max(16, Math.min(64, size + d));
    setSize(n);
    try {
      localStorage.setItem(SIZE_KEY, String(n));
    } catch {}
  }
  const t = clips[idx];
  useEffect(() => {
    document.getElementById("prompter-scroll")?.scrollTo({ top: 0 });
  }, [idx]);
  if (!t) return null;
  const done = shotDone(t);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="ปิด"><X size={22} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{t.shootOrder ? `#${t.shootOrder} ` : ""}{t.title}</p>
          <p className="text-[11px] text-white/50">คลิปที่ {idx + 1} / {clips.length}</p>
        </div>
        <button onClick={() => resize(-4)} className="rounded-lg bg-white/10 p-2" aria-label="ตัวเล็กลง"><Minus size={18} /></button>
        <span className="w-8 text-center text-xs tabular-nums text-white/70">{size}</span>
        <button onClick={() => resize(4)} className="rounded-lg bg-white/10 p-2" aria-label="ตัวใหญ่ขึ้น"><Plus size={18} /></button>
      </div>

      <div id="prompter-scroll" className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div style={{ fontSize: size, lineHeight: 1.5 }} className="mx-auto max-w-3xl">
          {t.scriptText?.trim() ? <ScriptText text={t.scriptText} /> : <p className="text-white/40">ยังไม่มีสคริปต์</p>}
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {done ? (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 py-4 text-lg font-semibold text-emerald-300"><Check size={22} /> ถ่ายแล้ว</p>
          ) : (
            <button
              disabled={busyId === t.id}
              onClick={async () => {
                await onShot(t);
                if (idx < clips.length - 1) setIdx(idx + 1);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white disabled:opacity-50"
            >
              <Check size={22} /> {busyId === t.id ? "กำลังบันทึก…" : "ถ่ายเสร็จ"}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="flex items-center justify-center gap-1 rounded-xl bg-white/10 py-3 text-sm disabled:opacity-30"><ChevronLeft size={18} /> คลิปก่อน</button>
            <button onClick={() => setIdx(Math.min(clips.length - 1, idx + 1))} disabled={idx >= clips.length - 1} className="flex items-center justify-center gap-1 rounded-xl bg-white/10 py-3 text-sm disabled:opacity-30">คลิปถัดไป <ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
