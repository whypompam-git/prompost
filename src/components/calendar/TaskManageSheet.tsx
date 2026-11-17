"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import { CalendarDays, ExternalLink, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { patchTaskWithFlow } from "@/lib/taskFlow";
import { STAGES, statusLabel, statusesFor } from "@/lib/workflow";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";
import { saveQueue } from "@/lib/supabase/queries";
import type { Queue } from "@/lib/types";
import { cn } from "@/lib/utils";

const sel = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300";
const lab = "mb-1 block text-[11px] font-medium text-gray-500";

// A popup for the clips behind one calendar / summary card — and only those: change step, status,
// dates, people for each clip, or the same thing for all of them at once. No trip to the dashboard.
export function TaskManageSheet({
  title,
  subtitle,
  tasks,
  staff,
  clients,
  queue,
  onChanged,
  onQueueChanged,
  onClose,
}: {
  title: string;
  subtitle?: string;
  tasks: Task[]; // the clips of the card (live: follows changes)
  staff: Staff[];
  clients: Client[];
  queue?: Queue; // a shoot card: the queue whose date moves
  onChanged: (t: Task) => void;
  onQueueChanged?: (q: Queue) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(tasks.length === 1 ? tasks[0].id : null);
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";

  async function patch(t: Task, fields: Partial<Task>) {
    setBusy(t.id);
    setError("");
    try {
      onChanged(await patchTaskWithFlow(t, fields));
    } catch {
      setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
    }
  }
  async function patchAll(fields: Partial<Task>) {
    setBusy("all");
    setError("");
    try {
      for (const t of tasks) onChanged(await patchTaskWithFlow(t, fields));
    } catch {
      setError("บันทึกไม่ครบ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
    }
  }
  async function moveQueue(date: string) {
    if (!queue || !date) return;
    setBusy("queue");
    try {
      await saveQueue({ ...queue, shootDate: date });
      onQueueChanged?.({ ...queue, shootDate: date });
    } catch {
      setError("ย้ายวันถ่ายไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  const people = (value: string | null | undefined, onPick: (id: string | null) => void, disabled?: boolean) => (
    <select value={value ?? ""} disabled={disabled} onChange={(e) => onPick(e.target.value || null)} className={sel}>
      <option value="">ยังไม่ระบุ</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-white sm:max-w-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{subtitle ? `${subtitle} · ` : ""}{tasks.length} งาน</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="ปิด"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {/* the same change for every clip in the card */}
          {tasks.length > 1 && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
              <p className="mb-2 text-xs font-semibold text-brand-700">ทำพร้อมกันทั้ง {tasks.length} งาน</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lab}>วันตัดต่อ (Deadline)</label>
                  <input type="date" disabled={busy !== null} onChange={(e) => e.target.value && patchAll({ editDate: e.target.value })} className={sel} />
                </div>
                <div>
                  <label className={lab}>วันถ่าย</label>
                  {queue ? (
                    <input type="date" value={queue.shootDate ?? ""} disabled={busy !== null} onChange={(e) => moveQueue(e.target.value)} className={sel} />
                  ) : (
                    <input type="date" disabled={busy !== null} onChange={(e) => e.target.value && patchAll({ scheduledDate: e.target.value })} className={sel} />
                  )}
                </div>
                <div>
                  <label className={lab}>Editor</label>
                  {people("", (id) => id && patchAll({ editorId: id }), busy !== null)}
                </div>
                <div>
                  <label className={lab}>ผู้รับผิดชอบ</label>
                  {people("", (id) => id && patchAll({ assigneeId: id }), busy !== null)}
                </div>
              </div>
            </div>
          )}
          {tasks.length === 1 && queue && (
            <div>
              <label className={lab}>วันถ่ายของคิว {queue.name}</label>
              <input type="date" value={queue.shootDate ?? ""} disabled={busy !== null} onChange={(e) => moveQueue(e.target.value)} className={sel} />
            </div>
          )}

          {tasks.map((t) => {
            const isOpen = open === t.id;
            return (
              <div key={t.id} className={cn("rounded-xl border bg-white", isOpen ? "border-brand-200 shadow-sm" : "border-gray-100")}>
                <button onClick={() => setOpen(isOpen ? null : t.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{t.title}</span>
                    <span className="block truncate text-[11px] text-gray-500">
                      {clientName(t.clientId)}
                      {t.editDate && ` · ตัด ${new Date(`${t.editDate}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`}
                    </span>
                  </span>
                  <StatusBadge status={t.status} stage={t.type} />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-gray-100 px-3 pb-3 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={lab}>ขั้นตอน</label>
                        <select value={t.type} disabled={busy === t.id} onChange={(e) => patch(t, { type: e.target.value as Task["type"] })} className={sel}>
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={lab}>สถานะ</label>
                        <select value={t.status} disabled={busy === t.id} onChange={(e) => patch(t, { status: e.target.value as TaskStatus })} className={sel}>
                          {statusesFor(t.type).map((s) => (
                            <option key={s} value={s}>{statusLabel(t.type, s)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={lab}>วันตัดต่อ (Deadline)</label>
                        <input type="date" value={t.editDate ?? ""} disabled={busy === t.id} onChange={(e) => patch(t, { editDate: e.target.value || null })} className={sel} />
                      </div>
                      <div>
                        <label className={lab}>วันถ่าย</label>
                        <input type="date" value={t.scheduledDate ?? ""} disabled={busy === t.id} onChange={(e) => e.target.value && patch(t, { scheduledDate: e.target.value })} className={sel} />
                      </div>
                      <div>
                        <label className={lab}>Editor</label>
                        {people(t.editorId, (id) => patch(t, { editorId: id }), busy === t.id)}
                      </div>
                      <div>
                        <label className={lab}>ผู้รับผิดชอบ</label>
                        {people(t.assigneeId, (id) => patch(t, { assigneeId: id }), busy === t.id)}
                      </div>
                    </div>
                    <Link href={`/tasks/${t.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                      <ExternalLink size={12} /> เปิดรายละเอียดเต็ม (สคริปต์ ฟุตเทจ ข้อความ LINE)
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><CalendarDays size={12} /> เปลี่ยนแล้วบันทึกทันที</span>
          <button onClick={onClose} className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white">เสร็จ</button>
        </div>
      </div>
    </div>
  );
}
