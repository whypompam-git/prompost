"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { th } from "date-fns/locale";
import { Plus } from "lucide-react";
import { PALETTE, pillClass, type ColorStem } from "@/lib/colors";
import type { CalendarChip, ChipGroup } from "@/lib/calendarChips";
import { cn } from "@/lib/utils";

const GROUP_COLOR: Record<ChipGroup, ColorStem> = { shoot: "sky", edit: "orange", send: "rose", other: "gray" };
const LEGEND: { group: ChipGroup; label: string }[] = [
  { group: "shoot", label: "ถ่าย (ตามคิว)" },
  { group: "edit", label: "ตัดต่อ/QC" },
  { group: "send", label: "ส่งงานให้ลูกค้า" },
  { group: "other", label: "งานอื่นๆ" },
];
const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const COLLAPSED = 3;

// A normal calendar: 7 day columns (Mon–Sun), summary chips inside each day.
// Used for both the month (several rows) and the week (one tall row).
export function CalendarGrid({
  days,
  chips,
  month,
  detailed = false,
  onAddTask,
}: {
  days: Date[];
  chips: CalendarChip[];
  month?: Date; // days outside this month are dimmed
  detailed?: boolean; // week view: show crew names under each chip
  onAddTask?: (date: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-gray-100 text-center text-xs font-medium text-gray-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const list = chips.filter((c) => isSameDay(new Date(c.date), day));
              const open = expanded.has(iso) || detailed;
              const shown = open ? list : list.slice(0, COLLAPSED);
              const dim = month && !isSameMonth(day, month);
              return (
                <div
                  key={iso}
                  className={cn(
                    "group min-h-[104px] border-b border-r border-gray-100 p-1.5",
                    detailed && "min-h-[260px]",
                    isToday(day) && "bg-brand-50/40",
                    dim && "bg-gray-50/60",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium",
                        isToday(day) ? "bg-brand-500 text-white" : dim ? "text-gray-300" : "text-gray-600",
                      )}
                    >
                      {day.getDate() === 1 || detailed ? format(day, detailed ? "d MMM" : "d MMM", { locale: th }) : day.getDate()}
                    </span>
                    {onAddTask && (
                      <button
                        onClick={() => onAddTask(iso)}
                        className="rounded-full p-1 text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-gray-500 group-hover:opacity-100"
                        aria-label="เพิ่มงาน"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {shown.map((chip) => (
                      <Link
                        key={chip.key}
                        href={chip.href}
                        title={`${chip.label}${chip.group !== "other" ? ` · ${chip.count} คลิป` : ""}${chip.crew.length ? ` · ${chip.crew.join(", ")}` : ""}`}
                        className={cn("flex min-w-0 flex-col rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight hover:brightness-95", pillClass(GROUP_COLOR[chip.group]))}
                      >
                        <span className="flex items-center gap-1">
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PALETTE[GROUP_COLOR[chip.group]].solid)} />
                          <span className="truncate">{chip.label}</span>
                        </span>
                        {chip.group !== "other" && (
                          <span className={cn("pl-2.5 font-normal opacity-80", !detailed && "truncate")}>
                            {chip.count} คลิป{detailed && chip.crew.length > 0 && ` · ${chip.crew.join(", ")}`}
                          </span>
                        )}
                      </Link>
                    ))}
                    {!open && list.length > COLLAPSED && (
                      <button
                        onClick={() => setExpanded((p) => new Set(p).add(iso))}
                        className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 hover:bg-gray-100"
                      >
                        +{list.length - COLLAPSED} รายการ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="text-gray-400">งาน Plan ไม่แสดงในปฏิทิน · งานถ่ายจะขึ้นเมื่อจัดเข้าคิวและใส่วันถ่ายแล้ว</span>
        {LEGEND.map((l) => (
          <div key={l.group} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", PALETTE[GROUP_COLOR[l.group]].solid)} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
