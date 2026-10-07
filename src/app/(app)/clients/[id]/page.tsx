"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle2, ListTodo, Loader, Film, Layers, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTaskSettings } from "@/lib/useTaskSettings";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientSubNav } from "@/components/clients/ClientSubNav";
import { BulkTaskModal, type BulkTaskValues } from "@/components/tasks/BulkTaskModal";
import { TaskModal, type TaskFormValues } from "@/components/tasks/TaskModal";
import { Toast } from "@/components/ui/Toast";
import {
  createTaskRow,
  createTasksBulk,
  createTasksFromSet,
  getClient,
  listContentSets,
  listStaff,
  listTasks,
  type ContentSet,
} from "@/lib/supabase/queries";
import type { Client, Staff, Task, TaskStatus } from "@/lib/types";

export default function ClientContentDashboardPage() {
  const { typeLabel } = useTaskSettings();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [creating, setCreating] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([getClient(params.id), listTasks()])
      .then(([c, allTasks]) => {
        if (!c) {
          setNotFound(true);
          return;
        }
        setClient(c);
        setTasks(allTasks.filter((t) => t.clientId === params.id));
      })
      .catch((err) => {
        console.error(err);
        window.alert(`โหลดข้อมูลลูกค้าไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    listStaff().then(setStaff).catch(console.error);
    listContentSets().then(setSets).catch(() => {});
  }, []);

  async function handleSave(values: TaskFormValues) {
    const created = await createTaskRow(values);
    setTasks((prev) => [created, ...prev]);
    setCreating(false);
    setToast("สำเร็จ");
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
    const all = await listTasks();
    setTasks(all.filter((t) => t.clientId === params.id));
    setBulkOpen(false);
    setToast("สำเร็จ");
  }

  const countByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status).length;

  if (loading) {
    return (
      <>
        <Topbar back="/clients" title="ลูกค้า" subtitle="" />
        <LoadingView />
      </>
    );
  }

  if (notFound || !client) {
    return (
      <>
        <Topbar back="/clients" title="ไม่พบลูกค้ารายนี้" subtitle="" />
        <div className="p-6">
          <button onClick={() => router.push("/clients")} className="text-sm text-brand-600 hover:underline">
            &larr; กลับไปหน้าลูกค้า
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar back="/clients" title={client.name} subtitle="รายงานคอนเทนต์" />
      <ClientSubNav clientId={client.id} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="คลิปทั้งหมด" value={tasks.length} icon={Film} tone="orange" />
          <StatCard label="ต้องทำ" value={countByStatus("todo")} icon={ListTodo} tone="gray" />
          <StatCard label="กำลังทำ" value={countByStatus("in_progress")} icon={Loader} tone="sky" />
          <StatCard label="เสร็จแล้ว" value={countByStatus("done")} icon={CheckCircle2} tone="emerald" />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-700">รายการงาน</h2>
            <div className="flex items-center gap-2">
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
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">งาน</th>
                  <th className="px-5 py-3 font-medium">ประเภท</th>
                  <th className="px-5 py-3 font-medium">กำหนดส่ง</th>
                  <th className="px-5 py-3 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer hover:bg-gray-50/60"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="px-5 py-3 text-gray-600">{typeLabel(task.type)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {format(new Date(task.dueDate), "d MMM yyyy", { locale: th })}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">
                      ยังไม่มีงานสำหรับลูกค้ารายนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Card className="text-xs text-gray-400">
          ดูข้อมูลติดต่อ/แพ็คเกจ/ใบเสนอราคา/ใบเสร็จได้ในแท็บ &quot;ข้อมูลลูกค้า&quot; ด้านบน
        </Card>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {creating && (
        <TaskModal
          clients={[client]}
          staff={staff}
          defaultClientId={client.id}
          onClose={() => setCreating(false)}
          onSave={handleSave}
        />
      )}
      {bulkOpen && (
        <BulkTaskModal
          clients={[client]}
          tasks={tasks}
          sets={sets}
          onClose={() => setBulkOpen(false)}
          onSave={handleBulkSave}
        />
      )}
    </>
  );
}
