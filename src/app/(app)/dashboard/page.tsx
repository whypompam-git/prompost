"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ListTodo, Loader, CheckCircle2, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskTable } from "@/components/dashboard/TaskTable";
import { TaskModal, type TaskFormValues } from "@/components/tasks/TaskModal";
import { LoadingView } from "@/components/ui/LoadingView";
import {
  createTaskRow,
  deleteTaskRow,
  listClients,
  listStaff,
  listTasks,
  updateTaskRow,
} from "@/lib/supabase/queries";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([listTasks(), listClients(), listStaff()])
      .then(([t, c, s]) => {
        setTasks(t);
        setClients(c);
        setStaff(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const countByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status).length;

  function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    updateTaskRow(taskId, { status }).catch(console.error);
  }

  function updateAssignee(taskId: string, assigneeId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assigneeId: assigneeId || null } : t)),
    );
    updateTaskRow(taskId, { assigneeId: assigneeId || null }).catch(console.error);
  }

  async function handleSave(values: TaskFormValues) {
    const created = await createTaskRow(values);
    setCreating(false);
    router.push(`/tasks/${created.id}`);
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`ลบงาน "${task.title}" ใช่ไหม?`)) return;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await deleteTaskRow(task.id);
    } catch (err) {
      console.error(err);
      setTasks((prev) => [task, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="แดชบอร์ด" subtitle="ภาพรวมงานและลูกค้าทั้งหมด" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="แดชบอร์ด" subtitle="ภาพรวมงานและลูกค้าทั้งหมด" />

      <div className="flex-1 space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="ลูกค้าทั้งหมด" value={clients.length} icon={Users} tone="orange" />
          <StatCard label="ต้องทำ" value={countByStatus("todo")} icon={ListTodo} tone="gray" />
          <StatCard label="กำลังทำ" value={countByStatus("in_progress")} icon={Loader} tone="sky" />
          <StatCard label="เสร็จแล้ว" value={countByStatus("done")} icon={CheckCircle2} tone="emerald" />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">รายการงานล่าสุด</h2>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus size={16} />
              เพิ่มงานใหม่
            </button>
          </div>
          <TaskTable
            tasks={tasks}
            clients={clients}
            staff={staff}
            onUpdateStatus={updateStatus}
            onUpdateAssignee={updateAssignee}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {creating && (
        <TaskModal
          clients={clients}
          staff={staff}
          onClose={() => setCreating(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
