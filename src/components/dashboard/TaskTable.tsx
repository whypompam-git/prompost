"use client";

import Link from "next/link";
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { TaskLinkButton } from "@/components/dashboard/TaskLinkButton";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TaskSortKey =
  | "title"
  | "client"
  | "type"
  | "scheduledDate"
  | "dueDate"
  | "status"
  | "assignee";

const TYPE_LABEL: Record<Task["type"], string> = {
  shoot: "ถ่ายทำ",
  edit: "ตัดต่อ",
  review: "ตรวจสอบ",
  deliver: "ส่งมอบ",
  other: "อื่นๆ",
};

const FIELD_STYLE =
  "cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300";

const STATUS_SELECT_STYLE: Record<TaskStatus, string> = {
  todo: "border-gray-200 bg-gray-50 text-gray-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  review: "border-amber-200 bg-amber-50 text-amber-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const SORT_COLUMNS: { key: TaskSortKey; label: string }[] = [
  { key: "title", label: "งาน" },
  { key: "client", label: "ลูกค้า" },
  { key: "type", label: "ประเภท" },
  { key: "scheduledDate", label: "วันถ่าย" },
  { key: "dueDate", label: "กำหนดส่ง" },
  { key: "status", label: "สถานะ" },
  { key: "assignee", label: "ผู้รับผิดชอบ" },
];

export function TaskTable({
  tasks,
  clients,
  staff,
  sortBy,
  sortDir,
  onSort,
  onUpdateStatus,
  onUpdateAssignee,
  onUpdateTask,
  onDelete,
}: {
  tasks: Task[];
  clients: Client[];
  staff: Staff[];
  sortBy: TaskSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: TaskSortKey) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateAssignee: (taskId: string, assigneeId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Omit<Task, "id">>) => void;
  onDelete: (task: Task) => void;
}) {
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const sortLabel = SORT_COLUMNS.find((c) => c.key === sortBy)?.label;

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>เรียงตาม</span>
          <select
            value={sortBy}
            onChange={(e) => onSort(e.target.value as TaskSortKey)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700"
          >
            {SORT_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onSort(sortBy)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-medium text-gray-700"
            aria-label={`สลับทิศทางการเรียง ${sortLabel}`}
          >
            {sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {sortDir === "asc" ? "น้อย→มาก" : "มาก→น้อย"}
          </button>
        </div>

        {tasks.map((task) => (
          <div key={task.id} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/tasks/${task.id}`}
                  className="block break-words text-base font-semibold leading-snug text-gray-900"
                >
                  {task.title}
                </Link>
                <p className="mt-0.5 text-sm text-gray-500">{clientName(task.clientId)}</p>
              </div>
              <button
                onClick={() => onDelete(task)}
                className="shrink-0 rounded-full p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label="ลบงาน"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MobileField label="วันถ่าย">
                <input
                  type="date"
                  value={task.scheduledDate}
                  onChange={(e) => e.target.value && onUpdateTask(task.id, { scheduledDate: e.target.value })}
                  className={cn(FIELD_STYLE, "w-full")}
                />
              </MobileField>
              <MobileField label="กำหนดส่ง">
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => e.target.value && onUpdateTask(task.id, { dueDate: e.target.value })}
                  className={cn(FIELD_STYLE, "w-full")}
                />
              </MobileField>
              <MobileField label="ประเภท">
                <select
                  value={task.type}
                  onChange={(e) => onUpdateTask(task.id, { type: e.target.value as Task["type"] })}
                  className={cn(FIELD_STYLE, "w-full")}
                >
                  {(Object.keys(TYPE_LABEL) as Task["type"][]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </MobileField>
              <MobileField label="สถานะ">
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                  className={cn(
                    "w-full cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium",
                    STATUS_SELECT_STYLE[task.status],
                  )}
                >
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABEL[st]}
                    </option>
                  ))}
                </select>
              </MobileField>
              <div className="col-span-2">
                <MobileField label="ผู้รับผิดชอบ">
                  <select
                    value={task.assigneeId ?? ""}
                    onChange={(e) => onUpdateAssignee(task.id, e.target.value)}
                    className={cn(FIELD_STYLE, "w-full")}
                  >
                    <option value="">ยังไม่มอบหมาย</option>
                    {staff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </MobileField>
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-t border-gray-50 pt-3">
              <TaskLinkButton label="Ref" url={task.refLink} onSave={(url) => onUpdateTask(task.id, { refLink: url ?? "" })} />
              <TaskLinkButton label="Draft" url={task.footageUrl} onSave={(url) => onUpdateTask(task.id, { footageUrl: url ?? "" })} />
              <TaskLinkButton label="Final" url={task.finalUrl} onSave={(url) => onUpdateTask(task.id, { finalUrl: url ?? "" })} />
              <Link
                href={`/tasks/${task.id}`}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-brand-600"
              >
                <Pencil size={12} />
                รายละเอียด
              </Link>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-gray-400">ไม่มีงาน</p>
        )}
      </div>

    <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card md:block">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
            {SORT_COLUMNS.map((col) => (
              <th key={col.key} className="px-5 py-3 font-medium">
                <button
                  onClick={() => onSort(col.key)}
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  {col.label}
                  {sortBy === col.key ? (
                    sortDir === "asc" ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )
                  ) : (
                    <ChevronsUpDown size={12} className="opacity-40" />
                  )}
                </button>
              </th>
            ))}
            <th className="px-5 py-3 font-medium">ลิงก์</th>
            <th className="px-5 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-50/60">
              <td className="px-5 py-3 font-medium text-gray-900">
                <Link href={`/tasks/${task.id}`} className="hover:text-brand-600 hover:underline">
                  {task.title}
                </Link>
              </td>
              <td className="px-5 py-3 text-gray-600">{clientName(task.clientId)}</td>
              <td className="px-5 py-3">
                <select
                  value={task.type}
                  onChange={(e) => onUpdateTask(task.id, { type: e.target.value as Task["type"] })}
                  className={FIELD_STYLE}
                >
                  {(Object.keys(TYPE_LABEL) as Task["type"][]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-5 py-3">
                <input
                  type="date"
                  value={task.scheduledDate}
                  onChange={(e) => e.target.value && onUpdateTask(task.id, { scheduledDate: e.target.value })}
                  className={FIELD_STYLE}
                />
              </td>
              <td className="px-5 py-3">
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => e.target.value && onUpdateTask(task.id, { dueDate: e.target.value })}
                  className={FIELD_STYLE}
                />
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
              <td className="px-5 py-3">
                <div className="flex gap-1.5">
                  <TaskLinkButton label="Ref" url={task.refLink} onSave={(url) => onUpdateTask(task.id, { refLink: url ?? "" })} />
                  <TaskLinkButton label="Draft" url={task.footageUrl} onSave={(url) => onUpdateTask(task.id, { footageUrl: url ?? "" })} />
                  <TaskLinkButton label="Final" url={task.finalUrl} onSave={(url) => onUpdateTask(task.id, { finalUrl: url ?? "" })} />
                </div>
              </td>
              <td className="px-5 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="ดู/แก้ไขงาน"
                  >
                    <Pencil size={14} />
                  </Link>
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
    </>
  );
}

function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-gray-400">{label}</span>
      {children}
    </label>
  );
}
