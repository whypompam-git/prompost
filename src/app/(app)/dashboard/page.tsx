"use client";

import { useEffect, useMemo, useState } from "react";
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
import { queueTaskEdit } from "@/lib/offline/queue";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [sortBy, setSortBy] = useState<"dueDate" | "status" | "assignee">("dueDate");

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

  const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? "";

  const visibleTasks = useMemo(() => {
    const filtered = clientFilter ? tasks.filter((t) => t.clientId === clientFilter) : tasks;
    return [...filtered].sort((a, b) => {
      if (sortBy === "status") return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (sortBy === "assignee") {
        const an = staffName(a.assigneeId);
        const bn = staffName(b.assigneeId);
        if (!an && bn) return 1;
        if (an && !bn) return -1;
        return an.localeCompare(bn, "th");
      }
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [tasks, clientFilter, sortBy, staff]);

  function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    updateTaskRow(taskId, { status }).catch(() => queueTaskEdit(taskId, { status }));
  }

  function updateAssignee(taskId: string, assigneeId: string) {
    const patch = { assigneeId: assigneeId || null };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    updateTaskRow(taskId, patch).catch(() => queueTaskEdit(taskId, patch));
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700">รายการงานล่าสุด</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">ลูกค้าทั้งหมด</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="dueDate">เรียงตามกำหนดส่ง</option>
                <option value="status">เรียงตามสถานะ</option>
                <option value="assignee">เรียงตามผู้รับผิดชอบ</option>
              </select>
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                <Plus size={16} />
                เพิ่มงานใหม่
              </button>
            </div>
          </div>
          <TaskTable
            tasks={visibleTasks}
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
