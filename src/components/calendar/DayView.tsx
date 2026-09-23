"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { Client, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const CLIENT_DOT: Record<string, string> = {
  orange: "bg-orange-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({
  date,
  tasks,
  clients,
  onAddTask,
}: {
  date: Date;
  tasks: Task[];
  clients: Client[];
  onAddTask?: (dateIso: string, time?: string) => void;
}) {
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const clientDot = (id: string) => CLIENT_DOT[clients.find((c) => c.id === id)?.colorTag ?? ""] ?? "bg-gray-400";
  const dateIso = date.toISOString().slice(0, 10);

  const allDayTasks = tasks.filter((t) => !t.startTime);
  const timedTasks = [...tasks.filter((t) => t.startTime)].sort((a, b) =>
    (a.startTime ?? "").localeCompare(b.startTime ?? ""),
  );

  const tasksInHour = (hour: number) =>
    timedTasks.filter((t) => Number(t.startTime!.split(":")[0]) === hour);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
      {allDayTasks.length > 0 && (
        <div className="border-b border-gray-100 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">ทั้งวัน</p>
          <div className="flex flex-wrap gap-1.5">
            {allDayTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", clientDot(task.clientId))} />
                {task.title}
                <span className="text-gray-400">· {clientName(task.clientId)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {HOURS.map((hour) => {
          const hourTasks = tasksInHour(hour);
          return (
            <div key={hour} className="group flex">
              <div className="w-16 shrink-0 border-r border-gray-100 px-3 py-2 text-xs text-gray-400">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="flex min-h-[44px] flex-1 flex-wrap items-center gap-1.5 px-2 py-1.5">
                {hourTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", clientDot(task.clientId))} />
                    <span className="tabular-nums">
                      {task.startTime}
                      {task.endTime ? `–${task.endTime}` : ""}
                    </span>
                    {task.title}
                    <span className="text-brand-400">· {clientName(task.clientId)}</span>
                  </Link>
                ))}
                {onAddTask && (
                  <button
                    onClick={() => onAddTask(dateIso, `${String(hour).padStart(2, "0")}:00`)}
                    className="rounded-full p-1 text-gray-300 opacity-0 transition hover:bg-gray-50 hover:text-gray-500 group-hover:opacity-100"
                    aria-label="เพิ่มงาน"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
