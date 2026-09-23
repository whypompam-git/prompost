"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle2, ListTodo, Loader, Film } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientSubNav } from "@/components/clients/ClientSubNav";
import { getClient, listTasks } from "@/lib/supabase/queries";
import type { Client, Task, TaskStatus } from "@/lib/types";

const TYPE_LABEL: Record<Task["type"], string> = {
  shoot: "ถ่ายทำ",
  edit: "ตัดต่อ",
  review: "ตรวจสอบ",
  deliver: "ส่งมอบ",
  other: "อื่นๆ",
};

export default function ClientContentDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      .finally(() => setLoading(false));
  }, [params.id]);

  const countByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status).length;

  if (loading) {
    return (
      <>
        <Topbar title="ลูกค้า" subtitle="" />
        <LoadingView />
      </>
    );
  }

  if (notFound || !client) {
    return (
      <>
        <Topbar title="ไม่พบลูกค้ารายนี้" subtitle="" />
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
      <Topbar title={client.name} subtitle="รายงานคอนเทนต์" />
      <ClientSubNav clientId={client.id} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="คลิปทั้งหมด" value={tasks.length} icon={Film} tone="orange" />
          <StatCard label="ต้องทำ" value={countByStatus("todo")} icon={ListTodo} tone="gray" />
          <StatCard label="กำลังทำ" value={countByStatus("in_progress")} icon={Loader} tone="sky" />
          <StatCard label="เสร็จแล้ว" value={countByStatus("done")} icon={CheckCircle2} tone="emerald" />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">รายการงาน</h2>
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
                    <td className="px-5 py-3 text-gray-600">{TYPE_LABEL[task.type]}</td>
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
    </>
  );
}
