"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { CalendarView } from "@/components/calendar/CalendarView";
import { WorkloadView } from "@/components/calendar/WorkloadView";
import { cn } from "@/lib/utils";

const KEY = "prompost:v2-calendar-view";
type Mode = "calendar" | "summary";

// New UI: the calendar and the work summary are the same dates seen two ways — one page, one switch.
export default function V2CalendarPage() {
  const [mode, setMode] = useState<Mode>("calendar");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "summary" || saved === "calendar") setMode(saved);
    } catch {}
  }, []);
  function pick(m: Mode) {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {}
  }

  return (
    <>
      <Topbar title="ปฏิทิน" subtitle={mode === "calendar" ? "คิวถ่ายและ Deadline ตัดต่อ" : "ใครถ่าย ใครตัด วันไหน"} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:inline-grid sm:w-auto">
          {([["calendar", "ปฏิทิน", CalendarDays], ["summary", "สรุปงาน", ClipboardList]] as const).map(([m, label, Icon]) => (
            <button
              key={m}
              onClick={() => pick(m)}
              className={cn("flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium", mode === m ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {mode === "calendar" ? <CalendarView /> : <WorkloadView />}
      </div>
    </>
  );
}
