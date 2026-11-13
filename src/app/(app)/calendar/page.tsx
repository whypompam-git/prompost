"use client";

import { Topbar } from "@/components/layout/Topbar";
import { CalendarView } from "@/components/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <>
      <Topbar title="ปฏิทินงาน" subtitle="คิวถ่ายและวันตัดต่อ (Deadline) ของแต่ละลูกค้า" />
      <div className="flex-1 p-4 sm:p-6">
        <CalendarView />
      </div>
    </>
  );
}
