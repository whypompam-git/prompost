"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listTaskRevisions, type TaskRevision } from "@/lib/supabase/queries";
import { notifyTaskEvent } from "@/lib/taskFlow";
import type { Staff, Task, Team } from "@/lib/types";
import { stageInfo } from "@/lib/workflow";

const SHOT_STAGES = new Set(["shoot", "edit", "qc", "pending", "approved", "posted"]);
const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const labelClass = "mb-1 block text-xs font-medium text-gray-500";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Pipeline view of one task: where it is, who shot it, and its revision trail.
export function WorkflowPanel({
  task,
  staff,
  teams,
  onPatch,
  onReload,
}: {
  task: Task;
  staff: Staff[];
  teams: Team[];
  onPatch: (fields: Partial<Task>) => void;
  onReload: () => Promise<void>;
}) {
  const [revisions, setRevisions] = useState<TaskRevision[]>([]);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listTaskRevisions(task.id).then(setRevisions).catch(() => {});
  }, [task.id, task.revisionCount]);

  async function sendBack() {
    if (!brief.trim()) return;
    setBusy(true);
    setError("");
    const res = await notifyTaskEvent(task.id, "qc_revise", brief.trim());
    if (res.ok) {
      setBrief("");
      await onReload();
    } else {
      setError(res.error === "task changed, refresh" ? "งานเปลี่ยนไปแล้ว รีเฟรชหน้านี้" : "ส่งกลับไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
    setBusy(false);
  }

  const stage = stageInfo(task.type);
  const showShooter = SHOT_STAGES.has(task.type);
  const awaitingFile = task.type === "shoot" && task.status === "done" && !task.footageUrl?.trim();

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">ขั้นตอน: {stage?.label ?? task.type}</span>
        <StatusBadge status={task.status} stage={task.type} />
        {(task.revisionCount ?? 0) > 0 && (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
            แก้รอบที่ {task.revisionCount}
          </span>
        )}
      </div>

      {awaitingFile && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ถ่ายเสร็จแล้ว — ใส่ลิงก์ Footage (Drive) ด้านล่าง แล้วงานจะเลื่อนไปขั้นตัดต่ออัตโนมัติ
        </p>
      )}

      {showShooter && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>คนถ่าย</label>
            <select
              value={task.shotById ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                const team = staff.find((s) => s.id === id)?.teamId;
                onPatch({ shotById: id, ...(team && !task.shotTeamId ? { shotTeamId: team } : {}) });
              }}
              className={inputClass}
            >
              <option value="">ยังไม่ระบุ</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>ทีมที่ถ่าย</label>
            <select value={task.shotTeamId ?? ""} onChange={(e) => onPatch({ shotTeamId: e.target.value || null })} className={inputClass}>
              <option value="">ยังไม่ระบุ</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {task.revisionBrief && (task.revisionCount ?? 0) > 0 && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
          <p className="text-xs font-medium text-rose-700">บรีฟแก้ล่าสุด</p>
          <p className="whitespace-pre-wrap text-sm text-gray-800">{task.revisionBrief}</p>
        </div>
      )}

      {task.type === "qc" && (
        <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">QC เจอจุดต้องแก้? ส่งกลับให้ตัดต่อพร้อมบรีฟ</p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="เช่น 0:12 เสียงเบา / ตัดช่วงต้นออก 2 วิ"
            className={inputClass}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={sendBack}
              disabled={busy || !brief.trim()}
              className="rounded-lg bg-rose-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-40"
            >
              {busy ? "กำลังส่ง..." : "สั่งแก้ (ส่งกลับตัดต่อ)"}
            </button>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
        </div>
      )}

      {revisions.length > 0 && (
        <div>
          <p className={labelClass}>ประวัติการแก้</p>
          <ul className="space-y-1.5">
            {revisions.map((r) => (
              <li key={r.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="mr-2 text-xs font-medium text-gray-500">
                  รอบ {r.round} · {r.source === "client" ? "ลูกค้า" : "QC"} · {fmt(r.createdAt)}
                </span>
                <span className="whitespace-pre-wrap text-gray-800">{r.brief}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
