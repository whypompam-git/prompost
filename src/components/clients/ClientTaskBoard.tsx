"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarDays, CheckCheck, ChevronDown, ChevronRight, Pencil, Trash2, Users } from "lucide-react";
import { TaskLinkButton } from "@/components/dashboard/TaskLinkButton";
import { QueueModal, type QueueDraft } from "@/components/clients/QueueModal";
import { ScriptEditor } from "@/components/ui/ScriptEditor";
import { updateTaskRow, saveQueue, deleteQueue } from "@/lib/supabase/queries";
import { patchTaskWithFlow } from "@/lib/taskFlow";
import { STAGES, statusLabel, statusesFor } from "@/lib/workflow";
import type { Client, Queue, Staff, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const sel = "rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300";

type Group = { key: string; title: string; queue?: Queue; tasks: Task[]; defaultOpen: boolean; hint?: string };

// The admin's working view of one client's clips: grouped by shoot queue, with
// the shoot order in front of each row, quick status/stage/assignee, and an
// expandable row for fixing the script on set.
export function ClientTaskBoard({
  client,
  tasks,
  queues,
  staff,
  onTasksChange,
  onQueuesChange,
  onToast,
}: {
  client: Client;
  tasks: Task[];
  queues: Queue[];
  staff: Staff[];
  onTasksChange: (updater: (prev: Task[]) => Task[]) => void;
  onQueuesChange: (updater: (prev: Queue[]) => Queue[]) => void;
  onToast: (msg: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignFor, setAssignFor] = useState<string[] | null>(null);
  const [editQueue, setEditQueue] = useState<Queue | null>(null);
  const [scriptDraft, setScriptDraft] = useState("");

  const staffName = (id?: string | null) => staff.find((s) => s.id === id)?.name;

  const groups = useMemo<Group[]>(() => {
    const byOrder = (a: Task, b: Task) =>
      (a.shootOrder ?? 9999) - (b.shootOrder ?? 9999) || a.title.localeCompare(b.title, "th", { numeric: true });
    const out: Group[] = [];
    const unqueuedShoot = tasks.filter((t) => t.type === "shoot" && !t.queueId);
    if (unqueuedShoot.length) out.push({ key: "unqueued", title: "รอจัดคิว", tasks: unqueuedShoot.sort(byOrder), defaultOpen: true, hint: "ผ่านแผนแล้ว ยังไม่ได้เลือกคิว/วันถ่าย — ไม่ขึ้นปฏิทิน" });
    for (const q of queues) {
      const mine = tasks.filter((t) => t.queueId === q.id);
      out.push({ key: q.id, title: q.name, queue: q, tasks: mine.sort(byOrder), defaultOpen: mine.length > 0 });
    }
    const plan = tasks.filter((t) => t.type === "plan");
    if (plan.length) out.push({ key: "plan", title: "Plan (รอลูกค้าเลือก)", tasks: plan.sort(byOrder), defaultOpen: false, hint: "ยังไม่เริ่มดำเนินการ — ไม่ขึ้นปฏิทิน" });
    const rest = tasks.filter((t) => t.type !== "plan" && !t.queueId && !(t.type === "shoot"));
    if (rest.length) out.push({ key: "rest", title: "งานอื่น (ไม่มีคิว)", tasks: rest.sort(byOrder), defaultOpen: false });
    return out;
  }, [tasks, queues]);

  const isOpen = (g: Group) => open[g.key] ?? g.defaultOpen;

  async function change(task: Task, fields: Partial<Task>) {
    const prev = task;
    onTasksChange((p) => p.map((t) => (t.id === task.id ? { ...t, ...fields } : t)));
    try {
      const saved = await patchTaskWithFlow(prev, fields);
      onTasksChange((p) => p.map((t) => (t.id === task.id ? saved : t)));
    } catch {
      onTasksChange((p) => p.map((t) => (t.id === task.id ? prev : t)));
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  function changeStage(task: Task, stage: string) {
    change(task, { type: stage });
    if (stage === "shoot" && !task.queueId) setAssignFor([task.id]);
  }

  async function assign(ids: string[], queueId: string | null, draft: QueueDraft | null) {
    let qid = queueId;
    if (!qid && draft) {
      const created = await saveQueue(draft);
      onQueuesChange((p) => [...p, created]);
      qid = created.id;
    }
    const idSet = new Set(ids);
    const mine = tasks.filter((t) => idSet.has(t.id));
    const queueEditDate = (queueId ? queues.find((q) => q.id === queueId)?.editDate : undefined) ?? draft?.editDate;
    for (const t of mine) {
      // the shooting order is filled in by hand on set (not numbered automatically)
      const fields: Partial<Task> = { queueId: qid };
      if (queueEditDate && !t.editDate) fields.editDate = queueEditDate;
      if (t.type === "plan") fields.type = "shoot";
      await change(t, fields);
    }
    setSelected(new Set());
    onToast(`จัด ${mine.length} คลิปเข้าคิวแล้ว`);
  }

  async function saveQueueEdit(draft: QueueDraft) {
    const before = queues.find((q) => q.id === draft.id);
    const saved = await saveQueue(draft);
    onQueuesChange((p) => p.map((q) => (q.id === saved.id ? saved : q)));
    // a new default วันตัดต่อ goes to every clip in the queue that hasn't passed editing
    if (saved.editDate && saved.editDate !== before?.editDate) {
      for (const t of tasks.filter((x) => x.queueId === saved.id && ["plan", "shoot", "edit", "qc"].includes(x.type))) {
        if (t.editDate !== saved.editDate) await change(t, { editDate: saved.editDate });
      }
    }
    onToast("บันทึกคิวแล้ว");
  }

  async function removeQueue(q: Queue) {
    if (!window.confirm(`ลบ "${q.name}"? คลิปในคิวจะกลับไปอยู่ "รอจัดคิว" (ไม่ถูกลบ)`)) return;
    await deleteQueue(q.id);
    onQueuesChange((p) => p.filter((x) => x.id !== q.id));
    onTasksChange((p) => p.map((t) => (t.queueId === q.id ? { ...t, queueId: null } : t)));
  }

  async function markQueueShot(g: Group) {
    const todo = g.tasks.filter((t) => t.type === "shoot" && t.status !== "done");
    if (todo.length === 0) return;
    if (!window.confirm(`ทำเครื่องหมาย "ถ่ายแล้ว" ${todo.length} คลิปในคิวนี้?`)) return;
    for (const t of todo) await change(t, { status: "done" });
    onToast("บันทึกแล้ว");
  }

  function toggleSelect(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  }

  function expand(t: Task) {
    if (expanded === t.id) return setExpanded(null);
    setExpanded(t.id);
    setScriptDraft(t.scriptText ?? "");
  }

  async function saveScript(t: Task) {
    try {
      await updateTaskRow(t.id, { scriptText: scriptDraft });
      onTasksChange((p) => p.map((x) => (x.id === t.id ? { ...x, scriptText: scriptDraft } : x)));
      onToast("บันทึกสคริปต์แล้ว");
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm shadow">
          <span className="font-medium text-brand-700">เลือก {selected.size} คลิป</span>
          <button onClick={() => setAssignFor([...selected])} className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600">
            จัดเข้าคิว…
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-500 hover:underline">
            ล้างที่เลือก
          </button>
        </div>
      )}

      {groups.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-card">ยังไม่มีงานสำหรับลูกค้ารายนี้</div>
      )}

      {groups.map((g) => {
        const shot = g.tasks.filter((t) => t.type !== "plan" && !(t.type === "shoot" && t.status !== "done")).length;
        return (
          <div key={g.key} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            <div className="flex flex-wrap items-center gap-2 bg-gray-50 px-4 py-2.5">
              <button onClick={() => setOpen((p) => ({ ...p, [g.key]: !isOpen(g) }))} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                {isOpen(g) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                {g.title}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">{g.tasks.length} คลิป</span>
              </button>
              {g.queue && (
                <>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <CalendarDays size={12} />
                    {g.queue.shootDate ? `ถ่าย ${format(new Date(g.queue.shootDate), "d MMM yyyy", { locale: th })}` : "ยังไม่ระบุวันถ่าย"}
                  </span>
                  {g.queue.crew.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users size={12} />
                      {g.queue.crew.map((id) => staffName(id)).filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">ถ่ายแล้ว/เลยขั้นถ่าย {shot}/{g.tasks.length}</span>
                  <span className="ml-auto flex gap-1">
                    <button onClick={() => markQueueShot(g)} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                      <CheckCheck size={12} /> ถ่ายแล้วทั้งคิว
                    </button>
                    <button onClick={() => setEditQueue(g.queue!)} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50" aria-label="แก้ไขคิว">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => removeQueue(g.queue!)} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:text-rose-600" aria-label="ลบคิว">
                      <Trash2 size={12} />
                    </button>
                  </span>
                </>
              )}
              {g.hint && <span className="text-xs text-gray-400">{g.hint}</span>}
            </div>

            {isOpen(g) && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {g.tasks.map((t) => (
                      <tr key={t.id} className="align-top">
                        <td className="w-8 px-3 py-2">
                          <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                        </td>
                        <td className="w-16 px-1 py-2">
                          {t.queueId ? (
                            <input
                              type="number"
                              min={1}
                              defaultValue={t.shootOrder ?? ""}
                              key={`${t.id}:${t.shootOrder ?? ""}`}
                              placeholder="#"
                              title="ลำดับการถ่ายในวันนั้น"
                              onBlur={(e) => {
                                const v = e.target.value === "" ? null : Number(e.target.value);
                                if (v !== (t.shootOrder ?? null)) change(t, { shootOrder: v });
                              }}
                              className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                            />
                          ) : (
                            <span className="block text-center text-xs text-gray-300">–</span>
                          )}
                        </td>
                        <td className="min-w-[200px] px-2 py-2">
                          <Link href={`/tasks/${t.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                            {t.title}
                          </Link>
                          {(t.revisionCount ?? 0) > 0 && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">แก้รอบ {t.revisionCount}</span>}
                        </td>
                        <td className="px-2 py-2">
                          <select value={t.type} onChange={(e) => changeStage(t, e.target.value)} className={sel}>
                            {STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select value={t.status} onChange={(e) => change(t, { status: e.target.value as TaskStatus })} className={sel}>
                            {statusesFor(t.type).map((s) => (
                              <option key={s} value={s}>
                                {statusLabel(t.type, s)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select value={t.assigneeId ?? ""} onChange={(e) => change(t, { assigneeId: e.target.value || null })} className={sel}>
                            <option value="">ยังไม่มอบหมาย</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-1 text-[10px] text-gray-400">
                            <label className="flex items-center gap-1">
                              ตัด
                              <input
                                type="date"
                                value={t.editDate ?? ""}
                                onChange={(e) => change(t, { editDate: e.target.value || null })}
                                title="วันตัดต่อ"
                                className="rounded border border-gray-200 px-1 py-0.5 text-[11px] text-gray-700 focus:outline-none"
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              ส่ง
                              <input
                                type="date"
                                value={t.dueDate}
                                onChange={(e) => e.target.value && change(t, { dueDate: e.target.value })}
                                title="วันส่ง"
                                className="rounded border border-gray-200 px-1 py-0.5 text-[11px] text-gray-700 focus:outline-none"
                              />
                            </label>
                          </div>
                        </td>
                        <td className="w-40 px-2 py-2 text-right">
                          <span className="mr-1.5 inline-flex items-center">
                            <TaskLinkButton label="File" url={t.footageUrl} onSave={(url) => change(t, { footageUrl: url ?? "" })} />
                          </span>
                          <button onClick={() => expand(t)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                            {expanded === t.id ? "ปิด" : "สคริปต์"}
                          </button>
                        </td>
                      </tr>
                    )).flatMap((row, i) => {
                      const t = g.tasks[i];
                      if (expanded !== t.id) return [row];
                      return [
                        row,
                        <tr key={`${t.id}-x`} className="bg-gray-50/60">
                          <td colSpan={8} className="space-y-3 px-5 py-3">
                            <ScriptEditor value={scriptDraft} onChange={setScriptDraft} />
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                defaultValue={t.footageUrl ?? ""}
                                placeholder="ลิงก์ Footage (Drive) — ใส่แล้วงานที่ถ่ายเสร็จจะเลื่อนไปตัดต่อ"
                                onBlur={(e) => e.target.value !== (t.footageUrl ?? "") && change(t, { footageUrl: e.target.value })}
                                className="min-w-[260px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                              />
                              <button onClick={() => saveScript(t)} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                                บันทึกสคริปต์
                              </button>
                              <button onClick={() => setAssignFor([t.id])} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                                ย้ายไปคิวอื่น…
                              </button>
                            </div>
                          </td>
                        </tr>,
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {assignFor && (
        <QueueModal
          client={client}
          staff={staff}
          queues={queues}
          clipCount={assignFor.length}
          onClose={() => setAssignFor(null)}
          onAssign={(qid, draft) => assign(assignFor, qid, draft)}
        />
      )}
      {editQueue && <QueueModal client={client} staff={staff} queues={queues} editing={editQueue} onClose={() => setEditQueue(null)} onSave={saveQueueEdit} />}
    </div>
  );
}
