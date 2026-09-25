"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, ListTodo, Loader, CheckCircle2, Plus, Layers } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ClientMultiFilter } from "@/components/dashboard/ClientMultiFilter";
import { BulkActionBar } from "@/components/dashboard/BulkActionBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskTable, type TaskSortKey } from "@/components/dashboard/TaskTable";
import { BulkTaskModal, type BulkTaskValues } from "@/components/tasks/BulkTaskModal";
import { TaskModal, type TaskFormValues } from "@/components/tasks/TaskModal";
import { Toast } from "@/components/ui/Toast";
import { LoadingView } from "@/components/ui/LoadingView";
import {
  createTaskRow,
  createTasksBulk,
  createTasksFromSet,
  listContentSets,
  type ContentSet,
  deleteTaskRow,
  listClients,
  listStaff,
  listTasks,
  updateTaskRow,
} from "@/lib/supabase/queries";
import { queueTaskEdit } from "@/lib/offline/queue";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";

const FILTER_KEY = "prompost:dashboard-filters";

function readSavedFilters(): {
  clients?: string[];
  sortBy?: TaskSortKey;
  sortDir?: "asc" | "desc";
} {
  try {
    return JSON.parse(localStorage.getItem(FILTER_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sets, setSets] = useState<ContentSet[]>([]);
  useEffect(() => {
    listContentSets().then(setSets).catch(() => {});
  }, []);
  const [toast, setToast] = useState("");
  const saved = useMemo(readSavedFilters, []);
  const [clientFilter, setClientFilter] = useState<string[]>(saved.clients ?? []);
  const [sortBy, setSortBy] = useState<TaskSortKey>(saved.sortBy ?? "dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(saved.sortDir ?? "asc");

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ clients: clientFilter, sortBy, sortDir }));
    } catch {}
  }, [clientFilter, sortBy, sortDir]);

  useEffect(() => {
    Promise.all([listTasks(), listClients(), listStaff()])
      .then(([t, c, s]) => {
        setTasks(t);
        setClients(c);
        setStaff(s);
        setClientFilter((prev) => prev.filter((id) => c.some((x) => x.id === id)));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreating(true);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  const countByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status).length;

  const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? "";

  const visibleTasks = useMemo(() => {
    const filtered = clientFilter.length ? tasks.filter((t) => clientFilter.includes(t.clientId)) : tasks;
    const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title, "th");
        case "client":
          return clientName(a.clientId).localeCompare(clientName(b.clientId), "th");
        case "type":
          return a.type.localeCompare(b.type);
        case "scheduledDate":
          return a.scheduledDate.localeCompare(b.scheduledDate);
        case "status":
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case "assignee": {
          const an = staffName(a.assigneeId);
          const bn = staffName(b.assigneeId);
          if (!an && bn) return 1;
          if (an && !bn) return -1;
          return an.localeCompare(bn, "th");
        }
        default:
          return a.dueDate.localeCompare(b.dueDate);
      }
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [tasks, clients, clientFilter, sortBy, sortDir, staff]);

  function handleSort(key: TaskSortKey) {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    updateTaskRow(taskId, { status }).catch(() => queueTaskEdit(taskId, { status }));
  }

  function updateAssignee(taskId: string, assigneeId: string) {
    const patch = { assigneeId: assigneeId || null };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    updateTaskRow(taskId, patch).catch(() => queueTaskEdit(taskId, patch));
  }

  function updateTask(taskId: string, patch: Partial<Omit<Task, "id">>) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    updateTaskRow(taskId, patch).catch(() => queueTaskEdit(taskId, patch));
  }

  async function handleBulkSave(values: BulkTaskValues) {
    if (values.set) {
      await createTasksFromSet({
        clientId: values.clientId,
        clientName: values.clientName,
        items: values.set.items,
        type: values.type,
        scheduledDate: values.scheduledDate,
        dueDate: values.dueDate,
      });
    } else {
      await createTasksBulk(values);
    }
    setTasks(await listTasks());
    setBulkOpen(false);
    setToast("สำเร็จ");
  }

  async function handleSave(values: TaskFormValues) {
    const created = await createTaskRow(values);
    setTasks((prev) => [created, ...prev]);
    setCreating(false);
    setToast("สำเร็จ");
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      visibleTasks.length > 0 && visibleTasks.every((t) => prev.has(t.id))
        ? new Set()
        : new Set(visibleTasks.map((t) => t.id)),
    );
  }

  function bulkPatch(patch: Partial<Omit<Task, "id">>) {
    selected.forEach((id) => updateTask(id, patch));
    setToast("สำเร็จ");
  }

  function bulkStatus(status: TaskStatus) {
    selected.forEach((id) => updateStatus(id, status));
    setToast("สำเร็จ");
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!window.confirm(`ลบ ${ids.length} งานที่เลือกใช่ไหม?`)) return;
    const removed = tasks.filter((t) => selected.has(t.id));
    setTasks((prev) => prev.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
    try {
      await Promise.all(ids.map((id) => deleteTaskRow(id)));
    } catch (err) {
      console.error(err);
      setTasks((prev) => [...removed, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
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

      <div className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard label="ลูกค้าทั้งหมด" value={clients.length} icon={Users} tone="orange" />
          <StatCard label="ต้องทำ" value={countByStatus("todo")} icon={ListTodo} tone="gray" />
          <StatCard label="กำลังทำ" value={countByStatus("in_progress")} icon={Loader} tone="sky" />
          <StatCard label="เสร็จแล้ว" value={countByStatus("done")} icon={CheckCircle2} tone="emerald" />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700">รายการงานล่าสุด</h2>
            <div className="flex flex-wrap items-center gap-2">
              <ClientMultiFilter clients={clients} selected={clientFilter} onChange={setClientFilter} />
              <button
                onClick={() => setBulkOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                <Layers size={16} />
                เพิ่มหลายงาน
              </button>
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
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onUpdateStatus={updateStatus}
            onUpdateAssignee={updateAssignee}
            onUpdateTask={updateTask}
            onDelete={handleDelete}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          clients={clients}
          staff={staff}
          onPatch={bulkPatch}
          onStatus={bulkStatus}
          onDelete={bulkDelete}
          onClear={() => setSelected(new Set())}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {bulkOpen && (
        <BulkTaskModal
          clients={clients}
          tasks={tasks}
          sets={sets}
          onClose={() => setBulkOpen(false)}
          onSave={handleBulkSave}
        />
      )}
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
