"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Client, Staff, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

// Tailwind can't see dynamically-built class names at build time, so client
// accent colors are looked up from this static map rather than interpolated.
const CLIENT_DOT: Record<string, string> = {
  orange: "bg-orange-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
};

const TYPE_STYLE: Record<Task["type"], { label: string; dot: string; chip: string }> = {
  shoot: { label: "ถ่ายทำ", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-700" },
  edit: { label: "ตัดต่อ", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700" },
  review: { label: "ตรวจสอบ", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  deliver: { label: "ส่งมอบ", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  other: { label: "อื่นๆ", dot: "bg-gray-400", chip: "bg-gray-50 text-gray-600" },
};

export function CalendarMatrix({
  tasks,
  clients,
  staff,
}: {
  tasks: Task[];
  clients: Client[];
  staff: Staff[];
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }),
    [month],
  );

  const tasksFor = (clientId: string, day: Date) =>
    tasks.filter((t) => t.clientId === clientId && isSameDay(new Date(t.scheduledDate), day));

  const assigneeName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? "ยังไม่มอบหมาย";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          {format(month, "MMMM yyyy", { locale: th })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            วันนี้
          </button>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-gray-100 bg-white shadow-card">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[92px] border-b border-r border-gray-100 bg-white px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                วันที่
              </th>
              {clients.map((client) => (
                <th
                  key={client.id}
                  className="sticky top-0 z-10 min-w-[160px] border-b border-gray-100 bg-white px-3 py-3 text-left text-xs font-semibold text-gray-700"
                >
                  <span
                    className={cn(
                      "mr-1.5 inline-block h-2 w-2 rounded-full",
                      CLIENT_DOT[client.colorTag] ?? "bg-gray-400",
                    )}
                  />
                  {client.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.toISOString()}>
                <td
                  className={cn(
                    "sticky left-0 z-10 border-b border-r border-gray-100 bg-white px-3 py-2 text-xs font-medium",
                    isToday(day) ? "text-brand-600" : "text-gray-500",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {isToday(day) && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                    {format(day, "d EEE", { locale: th })}
                  </div>
                </td>
                {clients.map((client) => {
                  const dayTasks = tasksFor(client.id, day);
                  return (
                    <td
                      key={client.id}
                      className={cn(
                        "border-b border-gray-100 px-2 py-2 align-top",
                        isToday(day) && "bg-brand-50/40",
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        {dayTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs font-medium transition hover:brightness-95",
                              TYPE_STYLE[task.type].chip,
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TYPE_STYLE[task.type].dot)} />
                            <span className="truncate">{task.title}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        {Object.entries(TYPE_STYLE).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", style.dot)} />
            {style.label}
          </div>
        ))}
      </div>

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {TYPE_STYLE[selectedTask.type].label}
                </p>
                <h3 className="mt-1 text-base font-semibold text-gray-900">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <Row label="ลูกค้า" value={clients.find((c) => c.id === selectedTask.clientId)?.name ?? "—"} />
              <Row
                label="วันที่ถ่าย/ทำงาน"
                value={format(new Date(selectedTask.scheduledDate), "d MMMM yyyy", { locale: th })}
              />
              <Row label="กำหนดส่ง" value={format(new Date(selectedTask.dueDate), "d MMMM yyyy", { locale: th })} />
              <Row label="ผู้รับผิดชอบ" value={assigneeName(selectedTask.assigneeId)} />
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">สถานะ</span>
                <StatusBadge status={selectedTask.status} />
              </div>
              {selectedTask.notes && (
                <div className="rounded-xl bg-gray-50 p-3 text-gray-600">{selectedTask.notes}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
