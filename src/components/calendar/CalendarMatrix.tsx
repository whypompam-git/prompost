"use client";

import Link from "next/link";
import { format, isSameDay, isToday } from "date-fns";
import { th } from "date-fns/locale";
import { Plus } from "lucide-react";
import type { Client, Task } from "@/lib/types";
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

// A pure date x client grid — used for both the Month and Week views, which
// only differ in how many `days` the parent hands it.
export function CalendarMatrix({
  days,
  tasks,
  clients,
  onAddTask,
}: {
  days: Date[];
  tasks: Task[];
  clients: Client[];
  onAddTask?: (clientId: string, date: string) => void;
}) {
  const tasksFor = (clientId: string, day: Date) =>
    tasks.filter((t) => t.clientId === clientId && isSameDay(new Date(t.scheduledDate), day));

  return (
    <div>
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
                        "group border-b border-gray-100 px-2 py-2 align-top",
                        isToday(day) && "bg-brand-50/40",
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        {dayTasks.map((task) => (
                          <Link
                            key={task.id}
                            href={`/tasks/${task.id}`}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs font-medium transition hover:brightness-95",
                              TYPE_STYLE[task.type].chip,
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TYPE_STYLE[task.type].dot)} />
                            {task.startTime && <span className="shrink-0 tabular-nums">{task.startTime}</span>}
                            <span className="truncate">{task.title}</span>
                          </Link>
                        ))}
                        {onAddTask && (
                          <button
                            onClick={() => onAddTask(client.id, format(day, "yyyy-MM-dd"))}
                            className="flex items-center justify-center rounded-lg py-1 text-gray-300 opacity-0 transition hover:bg-gray-50 hover:text-gray-500 group-hover:opacity-100"
                            aria-label="เพิ่มงาน"
                          >
                            <Plus size={13} />
                          </button>
                        )}
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
    </div>
  );
}
