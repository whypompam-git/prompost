"use client";

import { Topbar } from "@/components/layout/Topbar";
import { WorkloadView } from "@/components/calendar/WorkloadView";

export default function WorkloadPage() {
  return (
    <>
      <Topbar title="สรุปงาน" subtitle="ใครถ่าย ใครตัด วันไหน — ลากการ์ดเพื่อย้ายวัน" />
      <div className="flex-1 p-4 sm:p-6">
        <WorkloadView />
      </div>
    </>
  );
}
