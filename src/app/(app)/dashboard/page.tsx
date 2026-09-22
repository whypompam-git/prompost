import { Users, ListTodo, Loader, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskTable } from "@/components/dashboard/TaskTable";
import { mockClients, mockStaff, mockTasks } from "@/lib/mock-data";

export default function DashboardPage() {
  const totalClients = mockClients.length;
  const countByStatus = (status: (typeof mockTasks)[number]["status"]) =>
    mockTasks.filter((t) => t.status === status).length;

  return (
    <>
      <Topbar title="แดชบอร์ด" subtitle="ภาพรวมงานและลูกค้าทั้งหมด" />

      <div className="flex-1 space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="ลูกค้าทั้งหมด" value={totalClients} icon={Users} tone="orange" />
          <StatCard label="ต้องทำ" value={countByStatus("todo")} icon={ListTodo} tone="gray" />
          <StatCard label="กำลังทำ" value={countByStatus("in_progress")} icon={Loader} tone="sky" />
          <StatCard label="เสร็จแล้ว" value={countByStatus("done")} icon={CheckCircle2} tone="emerald" />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">รายการงานล่าสุด</h2>
          <TaskTable tasks={mockTasks} clients={mockClients} staff={mockStaff} />
        </div>
      </div>
    </>
  );
}
