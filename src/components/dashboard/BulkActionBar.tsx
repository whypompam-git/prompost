"use client";

import { Trash2, X } from "lucide-react";
import { STAGES, statusLabel } from "@/lib/workflow";
import type { Client, ContentCategory, Staff, Task, TaskStatus } from "@/lib/types";

const sel =
  "rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none";

// Floating bar for acting on many selected tasks at once. Each control
// applies immediately and resets itself, so it always reads as an action.
export function BulkActionBar({
  count,
  clients,
  staff,
  onPatch,
  onStage,
  onDelete,
  onClear,
}: {
  count: number;
  clients: Client[];
  staff: Staff[];
  onPatch: (patch: Partial<Omit<Task, "id">>) => void;
  onStage: (stage: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-3 shadow-xl md:bottom-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">เลือกอยู่ {count} งาน</p>
        <button onClick={onClear} className="rounded-full p-1 text-gray-400 hover:bg-gray-100" aria-label="ยกเลิกการเลือก">
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-gray-500">
          วันถ่าย
          <input type="date" className={sel} value="" onChange={(e) => e.target.value && onPatch({ scheduledDate: e.target.value })} />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          ส่ง
          <input type="date" className={sel} value="" onChange={(e) => e.target.value && onPatch({ dueDate: e.target.value })} />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          วันตัดต่อ
          <input type="date" className={sel} value="" onChange={(e) => e.target.value && onPatch({ editDate: e.target.value })} />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          วันโพส
          <input type="date" className={sel} value="" onChange={(e) => e.target.value && onPatch({ postDate: e.target.value })} />
        </label>
        <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ status: e.target.value as TaskStatus })}>
          <option value="">เปลี่ยนสถานะ…</option>
          {(["todo", "in_progress", "review", "done", "waiting"] as TaskStatus[]).map((st) => (
            <option key={st} value={st}>
              {statusLabel("other", st)}
            </option>
          ))}
        </select>
        <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ contentCategory: e.target.value as ContentCategory })}>
          <option value="">เปลี่ยนหมวด…</option>
          <option value="mass">Mass</option>
          <option value="royalty">Royalty</option>
          <option value="sell">Sell</option>
        </select>
        <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ editorId: e.target.value === "none" ? null : e.target.value })}>
          <option value="">เปลี่ยนผู้ตัดต่อ…</option>
          <option value="none">ไม่ระบุ</option>
          {staff.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ shotById: e.target.value === "none" ? null : e.target.value })}>
          <option value="">เปลี่ยนคนถ่าย…</option>
          <option value="none">ไม่ระบุ</option>
          {staff.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ clientId: e.target.value })}>
          <option value="">เปลี่ยนลูกค้า…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={sel} value="" onChange={(e) => e.target.value && onStage(e.target.value)}>
          <option value="">ย้ายไปขั้นตอน…</option>
          {STAGES.map((st) => (
            <option key={st.key} value={st.key}>
              {st.label}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value=""
          onChange={(e) => e.target.value && onPatch({ assigneeId: e.target.value === "none" ? null : e.target.value })}
        >
          <option value="">เปลี่ยนผู้รับผิดชอบ…</option>
          <option value="none">ยังไม่มอบหมาย</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
        >
          <Trash2 size={13} />
          ลบ
        </button>
      </div>
    </div>
  );
}
