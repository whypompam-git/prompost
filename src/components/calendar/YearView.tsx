"use client";

import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { th } from "date-fns/locale";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

export function YearView({
  year,
  tasks,
  onSelectDay,
}: {
  year: Date;
  tasks: Task[];
  onSelectDay: (date: Date) => void;
}) {
  const months = eachMonthOfInterval({ start: startOfYear(year), end: endOfYear(year) });

  const countFor = (day: Date) =>
    tasks.filter((t) => isSameDay(new Date(t.scheduledDate), day)).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        // Monday-first leading blanks
        const leadingBlanks = (getDay(monthStart) + 6) % 7;

        return (
          <div key={month.toISOString()} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
            <p className="mb-2 text-sm font-semibold text-gray-800">{format(month, "MMMM yyyy", { locale: th })}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d}>{d}</div>
              ))}
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {days.map((day) => {
                const count = countFor(day);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onSelectDay(day)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-md text-[11px] hover:bg-gray-100",
                      isToday(day) && "bg-brand-500 font-semibold text-white hover:bg-brand-600",
                      !isToday(day) && isSameMonth(day, month) && "text-gray-700",
                    )}
                  >
                    {format(day, "d")}
                    {count > 0 && (
                      <span
                        className={cn(
                          "mt-0.5 h-1 w-1 rounded-full",
                          isToday(day) ? "bg-white" : "bg-brand-500",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
