"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<Task["type"], string> = {
  shoot: "ถ่ายทำ",
  edit: "ตัดต่อ",
  review: "ตรวจสอบ",
  deliver: "ส่งมอบ",
  other: "อื่นๆ",
};

const STATUS_SELECT_STYLE: Record<TaskStatus, string> = {
  todo: "border-gray-200 bg-gray-50 text-gray-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  review: "border-amber-200 bg-amber-50 text-amber-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function TaskTable({
  tasks,
  clients,
  staff,
  onUpdateStatus,
  onUpdateAssignee,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  clients: Client[];
  staff: Staff[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateAssignee: (taskId: string, assigneeId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
            <th className="px-5 py-3 font-medium">งาน</th>
            <th className="px-5 py-3 font-medium">ลูกค้า</th>
            <th className="px-5 py-3 font-medium">ประเภท</th>
            <th className="px-5 py-3 font-medium">กำหนดส่ง</th>
            <th className="px-5 py-3 font-medium">สถานะ</th>
            <th className="px-5 py-3 font-medium">ผู้รับผิดชอบ</th>
            <th className="px-5 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-50/60">
              <td className="px-5 py-3 font-medium text-gray-900">{task.title}</td>
              <td className="px-5 py-3 text-gray-600">{clientName(task.clientId)}</td>
              <td className="px-5 py-3 text-gray-600">{TYPE_LABEL[task.type]}</td>
              <td className="px-5 py-3 text-gray-600">
                {format(new Date(task.dueDate), "d MMM", { locale: th })}
              </td>
              <td className="px-5 py-3">
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-300",
                    STATUS_SELECT_STYLE[task.status],
                  )}
                >
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-5 py-3">
                <select
                  value={task.assigneeId ?? ""}
                  onChange={(e) => onUpdateAssignee(task.id, e.target.value)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="">ยังไม่มอบหมาย</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-5 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => onEdit(task)}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="แก้ไขงาน"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(task)}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="ลบงาน"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
