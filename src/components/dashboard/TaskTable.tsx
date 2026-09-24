"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";
import { Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { TaskLinkButton } from "@/components/dashboard/TaskLinkButton";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import { isStem, pillClass, stemFromBg } from "@/lib/colors";
import { STATUS_KEYS } from "@/lib/taskSettings";
import { useTaskSettings } from "@/lib/useTaskSettings";
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

const SORT_COLUMNS: { key: TaskSortKey; label: string }[] = [
  { key: "title", label: "งาน" },
  { key: "client", label: "ลูกค้า" },
  { key: "scheduledDate", label: "วันถ่าย" },
  { key: "dueDate", label: "กำหนดส่ง" },
  { key: "type", label: "ประเภท" },
  { key: "status", label: "สถานะ" },
  { key: "assignee", label: "ผู้รับผิดชอบ" },
];

const dayMonth = (iso: string) => format(new Date(iso), "d MMM", { locale: th });

// A colored pill that is really a transparent <select> on top — tap to change.
function PillSelect({
  label,
  color,
  value,
  options,
  onChange,
  prefix,
}: {
  label: string;
  color: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex max-w-full items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium",
        pillClass(color),
      )}
    >
      {prefix && <span className="mr-1 opacity-60">{prefix}</span>}
      <span className="truncate">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={prefix ?? label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

// Day/month pill (no year, no icon) that opens the native date picker on tap.
function PillDate({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <span className="relative inline-flex items-center whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
      <span className="mr-1 opacity-60">{prefix}</span>
      {dayMonth(value)}
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={prefix}
      />
    </span>
  );
}

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
  const { types, typeLabel, typeColor, statusColor } = useTaskSettings();
  const clientOf = (id: string) => clients.find((c) => c.id === id);
  const clientName = (id: string) => clientOf(id)?.name ?? "—";
  const typeOptions = types.map((t) => ({ value: t.key, label: t.label }));
  const statusOptions = STATUS_KEYS.map((k) => ({ value: k, label: STATUS_LABEL[k] }));
  const assigneeOptions = [
    { value: "", label: "ยังไม่มอบหมาย" },
    ...staff.map((s) => ({ value: s.id, label: s.name })),
  ];
  const sortLabel = SORT_COLUMNS.find((c) => c.key === sortBy)?.label;

  return (
    <>
      {/* ── Phone: compact cards, fields in the order title → client → dates → type → status → assignee → links */}
      <div className="space-y-2.5 md:hidden">
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

        {tasks.map((task) => {
          const assignee = staff.find((s) => s.id === task.assigneeId);
          return (
            <div key={task.id} className="space-y-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/tasks/${task.id}`}
                  className="min-w-0 text-[13px] font-semibold leading-snug text-gray-900"
                >
                  {task.title}
                </Link>
                <button
                  onClick={() => onDelete(task)}
                  className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="ลบงาน"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <span
                className={cn(
                  "inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  pillClass(isStem(clientOf(task.clientId)?.colorTag) ? clientOf(task.clientId)?.colorTag : "orange"),
                )}
              >
                {clientName(task.clientId)}
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <PillDate
                  prefix="ถ่าย"
                  value={task.scheduledDate}
                  onChange={(v) => onUpdateTask(task.id, { scheduledDate: v })}
                />
                <PillDate prefix="ส่ง" value={task.dueDate} onChange={(v) => onUpdateTask(task.id, { dueDate: v })} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <PillSelect
                  label={typeLabel(task.type)}
                  color={typeColor(task.type)}
                  value={task.type}
                  options={typeOptions}
                  onChange={(v) => onUpdateTask(task.id, { type: v })}
                />
                <PillSelect
                  label={STATUS_LABEL[task.status]}
                  color={statusColor(task.status)}
                  value={task.status}
                  options={statusOptions}
                  onChange={(v) => onUpdateStatus(task.id, v as TaskStatus)}
                />
                <PillSelect
                  label={assignee?.name ?? "ไม่มอบหมาย"}
                  color={assignee ? stemFromBg(assignee.avatarColor) : "gray"}
                  value={task.assigneeId ?? ""}
                  options={assigneeOptions}
                  onChange={(v) => onUpdateAssignee(task.id, v)}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <TaskLinkButton label="Ref" url={task.refLink} onSave={(url) => onUpdateTask(task.id, { refLink: url ?? "" })} />
                <TaskLinkButton label="Draft" url={task.footageUrl} onSave={(url) => onUpdateTask(task.id, { footageUrl: url ?? "" })} />
                <TaskLinkButton label="Final" url={task.finalUrl} onSave={(url) => onUpdateTask(task.id, { finalUrl: url ?? "" })} />
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-gray-400">ไม่มีงาน</p>
        )}
      </div>

      {/* ── Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card md:block">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              {SORT_COLUMNS.map((col) => (
                <th key={col.key} className="px-5 py-3 font-medium">
                  <button onClick={() => onSort(col.key)} className="flex items-center gap-1 hover:text-gray-600">
                    {col.label}
                    {sortBy === col.key ? (
                      sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
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
            {tasks.map((task) => {
              const assignee = staff.find((s) => s.id === task.assigneeId);
              return (
                <tr key={task.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <Link href={`/tasks/${task.id}`} className="hover:text-brand-600 hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
                        pillClass(isStem(clientOf(task.clientId)?.colorTag) ? clientOf(task.clientId)?.colorTag : "orange"),
                      )}
                    >
                      {clientName(task.clientId)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <PillDate prefix="" value={task.scheduledDate} onChange={(v) => onUpdateTask(task.id, { scheduledDate: v })} />
                  </td>
                  <td className="px-5 py-3">
                    <PillDate prefix="" value={task.dueDate} onChange={(v) => onUpdateTask(task.id, { dueDate: v })} />
                  </td>
                  <td className="px-5 py-3">
                    <PillSelect
                      label={typeLabel(task.type)}
                      color={typeColor(task.type)}
                      value={task.type}
                      options={typeOptions}
                      onChange={(v) => onUpdateTask(task.id, { type: v })}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <PillSelect
                      label={STATUS_LABEL[task.status]}
                      color={statusColor(task.status)}
                      value={task.status}
                      options={statusOptions}
                      onChange={(v) => onUpdateStatus(task.id, v as TaskStatus)}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <PillSelect
                      label={assignee?.name ?? "ยังไม่มอบหมาย"}
                      color={assignee ? stemFromBg(assignee.avatarColor) : "gray"}
                      value={task.assigneeId ?? ""}
                      options={assigneeOptions}
                      onChange={(v) => onUpdateAssignee(task.id, v)}
                    />
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
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
