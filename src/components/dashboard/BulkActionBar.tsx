"use client";

import { Trash2, X } from "lucide-react";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import { STATUS_KEYS } from "@/lib/taskSettings";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";

const sel =
  "rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none";

// Floating bar for acting on many selected tasks at once. Each control
// applies immediately and resets itself, so it always reads as an action.
export function BulkActionBar({
  count,
  clients,
  staff,
  onPatch,
  onStatus,
  onDelete,
  onClear,
}: {
  count: number;
  clients: Client[];
  staff: Staff[];
  onPatch: (patch: Partial<Omit<Task, "id">>) => void;
  onStatus: (status: TaskStatus) => void;
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
        <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ clientId: e.target.value })}>
          <option value="">เปลี่ยนลูกค้า…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={sel} value="" onChange={(e) => e.target.value && onStatus(e.target.value as TaskStatus)}>
          <option value="">เปลี่ยนสถานะ…</option>
          {STATUS_KEYS.map((k) => (
            <option key={k} value={k}>
              {STATUS_LABEL[k]}
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
