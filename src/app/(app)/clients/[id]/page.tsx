"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Layers, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { StageSummary } from "@/components/clients/StageSummary";
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
  listQueues,
  listTasksForClient,
  type ContentSet,
} from "@/lib/supabase/queries";
import { ClientTaskBoard } from "@/components/clients/ClientTaskBoard";
import { SUMMARY_GROUPS } from "@/lib/workflow";
import type { Client, Queue, Staff, Task } from "@/lib/types";

export default function ClientContentDashboardPage() {
  const { typeLabel } = useTaskSettings();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueFilter, setQueueFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [creating, setCreating] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([getClient(params.id), listTasksForClient(params.id), listQueues(params.id).catch(() => [] as Queue[])])
      .then(([c, clientTasks, qs]) => {
        setQueues(qs);
        if (!c) {
          setNotFound(true);
          return;
        }
        setClient(c);
        setTasks(clientTasks);
      })
      .catch((err) => {
        console.error(err);
        window.alert(`โหลดข้อมูลลูกค้าไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // deep links from the calendar chips: ?stage=shoot|edit|send&queue=<id>
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const st = sp.get("stage");
    setStagePick(st === "send" ? "pending" : st);
    setQueueFilter(sp.get("queue"));
  }, []);

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
    setTasks(await listTasksForClient(params.id));
    setBulkOpen(false);
    setToast("สำเร็จ");
  }

  const [stagePick, setStagePick] = useState<string | null>(null);
  const shownTasks = tasks.filter(
    (t) =>
      (!stagePick || (SUMMARY_GROUPS.find((g) => g.key === stagePick)?.stages as string[] | undefined)?.includes(t.type)) &&
      (!queueFilter || t.queueId === queueFilter),
  );

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
        <StageSummary tasks={tasks} onPick={setStagePick} active={stagePick} />

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
          {(stagePick || queueFilter) && (
            <button
              onClick={() => {
                setStagePick(null);
                setQueueFilter(null);
              }}
              className="mb-3 rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white"
            >
              กำลังกรอง{queueFilter ? ` · ${queues.find((q) => q.id === queueFilter)?.name ?? "คิว"}` : ""}{stagePick ? ` · ${SUMMARY_GROUPS.find((g) => g.key === stagePick)?.label ?? ""}` : ""} ✕ ล้างตัวกรอง
            </button>
          )}
          <ClientTaskBoard
            client={client}
            tasks={shownTasks}
            queues={queueFilter ? queues.filter((q) => q.id === queueFilter) : queues}
            staff={staff}
            onTasksChange={(updater) => setTasks((prev) => {
              // the board works on the filtered list; merge its edits back by id
              const edited = updater(prev.filter((t) => shownTasks.some((s) => s.id === t.id)));
              const byId = new Map(edited.map((t) => [t.id, t]));
              return prev.map((t) => byId.get(t.id) ?? t);
            })}
            onQueuesChange={setQueues}
            onToast={setToast}
          />
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
