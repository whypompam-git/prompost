"use client";

import { announceChanges, flowPatch } from "@/lib/taskFlow";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Layers } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ClientMultiFilter } from "@/components/dashboard/ClientMultiFilter";
import { StaffFilter } from "@/components/dashboard/StaffFilter";
import { BulkActionBar } from "@/components/dashboard/BulkActionBar";
import { TaskTable, type TaskSortKey } from "@/components/dashboard/TaskTable";
import { BulkTaskModal, type BulkTaskValues } from "@/components/tasks/BulkTaskModal";
import { TaskModal, type TaskFormValues } from "@/components/tasks/TaskModal";
import { cn } from "@/lib/utils";
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
  listTeams,
  updateTaskRow,
} from "@/lib/supabase/queries";
import { useAuth } from "@/lib/auth/AuthContext";
import { STAGES } from "@/lib/workflow";
import { queueTaskEdit } from "@/lib/offline/queue";
import type { Client, Staff, Task, TaskStatus, Team } from "@/lib/types";

const FILTER_KEY = "prompost:dashboard-filters";

function readSavedFilters(): {
  clients?: string[];
  staff?: string;
  sortBy?: TaskSortKey;
  sortDir?: "asc" | "desc";
  view?: "team" | "mine";
  team?: string;
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
  const [teams, setTeams] = useState<Team[]>([]);
  const auth = useAuth();
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
  const [staffFilter, setStaffFilter] = useState<string>(saved.staff ?? "");
  const [sortBy, setSortBy] = useState<TaskSortKey>(saved.sortBy ?? "dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(saved.sortDir ?? "asc");
  const [view, setView] = useState<"team" | "mine">(saved.view ?? "team");
  const [teamFilter, setTeamFilter] = useState<string>(saved.team ?? "");
  const [stageFilter, setStageFilter] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ clients: clientFilter, staff: staffFilter, sortBy, sortDir, view, team: teamFilter }));
    } catch {}
  }, [clientFilter, staffFilter, sortBy, sortDir, view, teamFilter]);

  useEffect(() => {
    Promise.all([listTasks(), listClients(), listStaff(), listTeams().catch(() => [] as Team[])])
      .then(([t, c, s, tm]) => {
        setTeams(tm);
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

  // everything the filters (client / person / team / my-tasks) let through,
  // before the stage chip — so the chip numbers always match the table below
  const scopeTasks = useMemo(() => {
    let filtered = clientFilter.length ? tasks.filter((t) => clientFilter.includes(t.clientId)) : tasks;
    if (view === "mine") {
      // mine = assigned to me, shot by me, or a client I look after (ผู้ดูแลลูกค้า)
      const myClients = new Set(clients.filter((c) => c.managerId === auth.staffId).map((c) => c.id));
      filtered = filtered.filter((t) => t.assigneeId === auth.staffId || t.shotById === auth.staffId || myClients.has(t.clientId));
    } else {
      if (staffFilter) filtered = filtered.filter((t) => t.assigneeId === staffFilter);
      if (teamFilter) {
        const inTeam = new Set(staff.filter((s) => s.teamId === teamFilter).map((s) => s.id));
        filtered = filtered.filter((t) => t.shotTeamId === teamFilter || (t.assigneeId && inTeam.has(t.assigneeId)));
      }
    }
    return filtered;
  }, [tasks, clients, clientFilter, view, staffFilter, teamFilter, staff, auth.staffId]);

  const STATUS_ORDER: Record<TaskStatus, number> = { waiting: 0, todo: 1, in_progress: 2, review: 3, done: 4 };
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? "";

  const visibleTasks = useMemo(() => {
    let filtered = scopeTasks;
    if (stageFilter) filtered = filtered.filter((t) => t.type === stageFilter);
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
        case "editDate":
          return (a.editDate ?? "9999").localeCompare(b.editDate ?? "9999");
        case "difficulty":
          return (b.editDifficulty ?? 0) - (a.editDifficulty ?? 0);
        case "editor": {
          const an = staffName(a.editorId ?? null);
          const bn = staffName(b.editorId ?? null);
          if (!an && bn) return 1;
          if (an && !bn) return -1;
          return an.localeCompare(bn, "th");
        }
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
  }, [scopeTasks, clients, sortBy, sortDir, staff, stageFilter]);

  function handleSort(key: TaskSortKey) {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  // every quick edit goes through the pipeline rules (hand-offs + notifications)
  function applyChange(taskId: string, fields: Partial<Omit<Task, "id">>) {
    const prev = tasks.find((t) => t.id === taskId);
    if (!prev) return;
    const patch = flowPatch(prev, fields);
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    updateTaskRow(taskId, patch)
      .then(() => announceChanges(prev, { ...prev, ...patch }))
      .catch(() => queueTaskEdit(taskId, patch));
  }

  function updateStatus(taskId: string, status: TaskStatus) {
    applyChange(taskId, { status });
  }

  function updateAssignee(taskId: string, assigneeId: string) {
    applyChange(taskId, { assigneeId: assigneeId || null });
  }

  function updateTask(taskId: string, patch: Partial<Omit<Task, "id">>) {
    applyChange(taskId, patch);
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
    announceChanges(null, created);
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

  function bulkStage(stage: string) {
    selected.forEach((id) => updateTask(id, { type: stage }));
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm font-medium">
            {([["team", "งานทีม"], ["mine", "งานของฉัน"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn("rounded-md px-3 py-1.5", view === key ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50")}
              >
                {label}
              </button>
            ))}
          </div>
          {view === "team" && teams.length > 0 && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
            >
              <option value="">ทุกทีม</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {(clientFilter.length > 0 || staffFilter || teamFilter) && (
          <button
            onClick={() => {
              setClientFilter([]);
              setStaffFilter("");
              setTeamFilter("");
            }}
            className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white"
          >
            กำลังกรอง
            {clientFilter.length > 0 && ` · ลูกค้า ${clientFilter.length === 1 ? clients.find((c) => c.id === clientFilter[0])?.name ?? "" : `${clientFilter.length} ราย`}`}
            {staffFilter && ` · ${staff.find((x) => x.id === staffFilter)?.name ?? ""}`}
            {teamFilter && ` · ${teams.find((t) => t.id === teamFilter)?.name ?? ""}`} ✕ ล้างตัวกรอง
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStageFilter("")}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", !stageFilter ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")}
          >
            ทั้งหมด {scopeTasks.length}
          </button>
          {STAGES.map((st) => {
            const n = scopeTasks.filter((t) => t.type === st.key).length;
            if (n === 0 && st.key === "other") return null;
            return (
              <button
                key={st.key}
                onClick={() => setStageFilter(stageFilter === st.key ? "" : st.key)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", stageFilter === st.key ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")}
              >
                {st.label} {n}
              </button>
            );
          })}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700">รายการงานล่าสุด</h2>
            <div className="flex flex-wrap items-center gap-2">
              <ClientMultiFilter clients={clients} selected={clientFilter} onChange={setClientFilter} />
              {view === "team" && <StaffFilter staff={staff} selected={staffFilter} onChange={setStaffFilter} />}
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
          onStage={bulkStage}
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
