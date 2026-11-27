"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import { Printer } from "lucide-react";
import { TaskLinkButton } from "@/components/dashboard/TaskLinkButton";
import { PostDateField } from "@/components/tasks/PostDateField";
import { BulkActionBar } from "@/components/dashboard/BulkActionBar";
import { QueueModal, type QueueDraft } from "@/components/clients/QueueModal";
import { ScriptEditor } from "@/components/ui/ScriptEditor";
import { updateTaskRow, saveQueue, deleteTaskRow } from "@/lib/supabase/queries";
import { patchTaskWithFlow } from "@/lib/taskFlow";
import { STAGES, statusLabel, statusesFor } from "@/lib/workflow";
import type { Client, Queue, Staff, Task, TaskStatus } from "@/lib/types";

const sel = "w-full max-w-full truncate rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300";

// The admin's working view of one client's clips: one list, with
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignFor, setAssignFor] = useState<string[] | null>(null);
  const [scriptDraft, setScriptDraft] = useState("");

  // one flat list (no queue groups), in natural title order
  const rows = useMemo(() => [...tasks].sort((a, b) => a.title.localeCompare(b.title, "th", { numeric: true })), [tasks]);
  const allSelected = rows.length > 0 && rows.every((t) => selected.has(t.id));

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

  async function bulkDelete() {
    const ids = [...selected];
    if (!window.confirm(`ลบ ${ids.length} งานที่เลือกใช่ไหม?`)) return;
    const removed = tasks.filter((t) => selected.has(t.id));
    onTasksChange((p) => p.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
    try {
      await Promise.all(ids.map((id) => deleteTaskRow(id)));
    } catch {
      onTasksChange((p) => [...removed, ...p]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
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
        <BulkActionBar
          count={selected.size}
          total={tasks.length}
          onSelectAll={() => setSelected(new Set(tasks.map((t) => t.id)))}
          clients={[client]}
          staff={staff}
          onPatch={(patch) => {
            selected.forEach((id) => {
              const t = tasks.find((x) => x.id === id);
              if (t) void change(t, patch);
            });
            onToast("บันทึกแล้ว");
          }}
          onStage={(stage) => {
            selected.forEach((id) => {
              const t = tasks.find((x) => x.id === id);
              if (t) changeStage(t, stage);
            });
            onToast("บันทึกแล้ว");
          }}
          onDelete={bulkDelete}
          onClear={() => setSelected(new Set())}
          extraLabel="คิว / พิมพ์"
          extra={
            <>
              <button onClick={() => setAssignFor([...selected])} className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                จัดเข้าคิว…
              </button>
              <a href={`/print/scripts?ids=${[...selected].join(",")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
                <Printer size={14} /> พิมพ์สคริปต์ (A4 + QR)
              </a>
            </>
          }
        />
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-card">ยังไม่มีงานสำหรับลูกค้ารายนี้</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
          <label className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((t) => t.id)))} />
            เลือกทั้งหมด
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">{rows.length} คลิป</span>
          </label>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((t) => (
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
                        <td className="w-[88px] px-1.5 py-2">
                          <select value={t.type} onChange={(e) => changeStage(t, e.target.value)} className={sel}>
                            {STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-[104px] px-1.5 py-2">
                          <select value={t.status} onChange={(e) => change(t, { status: e.target.value as TaskStatus })} className={sel}>
                            {statusesFor(t.type).map((s) => (
                              <option key={s} value={s}>
                                {statusLabel(t.type, s)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-[112px] px-1.5 py-2">
                          <select value={t.assigneeId ?? ""} onChange={(e) => change(t, { assigneeId: e.target.value || null })} className={sel}>
                            <option value="">ยังไม่มอบหมาย</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-[104px] px-1.5 py-2">
                          <select
                            value={t.editorId ?? ""}
                            onChange={(e) => change(t, { editorId: e.target.value || null })}
                            className={sel}
                            title="Editor (คนตัดต่อ)"
                          >
                            <option value="">Editor: —</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-1 text-[10px] text-gray-400">
                            {t.type !== "plan" && (
                            <label className="flex items-center gap-1">
                              Deadline
                              <input
                                type="date"
                                value={t.editDate ?? ""}
                                onChange={(e) => change(t, { editDate: e.target.value || null })}
                                title="Deadline (วันตัดต่อ = ส่งลูกค้า)"
                                className="rounded border border-gray-200 px-1 py-0.5 text-[11px] text-gray-700 focus:outline-none"
                              />
                            </label>
                            )}
                            {(t.type === "approved" || t.type === "posted") && (
                              <div className="flex flex-col gap-0.5">
                                <span>วันโพส</span>
                                <PostDateField compact postDate={t.postDate} postBy={t.postBy} onChange={(p) => change(t, p)} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="w-56 px-2 py-2 text-right">
                          <span className="mr-1.5 inline-flex items-center">
                            <TaskLinkButton label="Ref" url={t.refLink} onSave={(url) => change(t, { refLink: url ?? "" })} />
                            <TaskLinkButton label="File" url={t.footageUrl} onSave={(url) => change(t, { footageUrl: url ?? "" })} />
                            <TaskLinkButton tone="blue" label="Final" url={t.finalUrl} onSave={(url) => change(t, { finalUrl: url ?? "" })} />
                          </span>
                          <button onClick={() => expand(t)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                            {expanded === t.id ? "ปิด" : "สคริปต์"}
                          </button>
                        </td>
                      </tr>
                    )).flatMap((row, i) => {
                      const t = rows[i];
                      if (expanded !== t.id) return [row];
                      return [
                        row,
                        <tr key={`${t.id}-x`} className="bg-gray-50/60">
                          <td colSpan={10} className="space-y-3 px-5 py-3">
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
        </div>
      )}

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
    </div>
  );
}
