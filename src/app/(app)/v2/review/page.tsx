"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { listClients, listTasks } from "@/lib/supabase/queries";
import type { Client, Task } from "@/lib/types";

const day = (iso?: string | null) => (iso ? new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "—");

// New UI "ตรวจดราฟ" — placeholder until its design is decided: clips waiting for
// our QC, and clips waiting for the client to check.
export default function V2ReviewPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([listTasks(), listClients()])
      .then(([t, c]) => {
        setTasks(t);
        setClients(c);
      })
      .finally(() => setLoading(false));
  }, []);
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? "";
  const groups = useMemo(
    () => [
      { title: "รอเราตรวจ (QC)", list: tasks.filter((t) => t.type === "qc" && t.status !== "done") },
      { title: "รอลูกค้าตรวจ", list: tasks.filter((t) => t.type === "pending") },
    ],
    [tasks],
  );

  return (
    <>
      <Topbar title="ตรวจดราฟ" />
      <div className="flex-1 space-y-5 p-4 sm:p-6">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">หน้านี้เป็นฉบับชั่วคราว — หน้าตรวจดราฟแบบใหม่กำลังออกแบบ</p>
        {loading ? (
          <LoadingView />
        ) : (
          groups.map((g) => (
            <section key={g.title}>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                {g.title} <span className="text-gray-400">({g.list.length})</span>
              </h2>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                {g.list.map((t) => (
                  <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-800">{t.title}</span>
                      <span className="block text-xs text-gray-400">{name(t.clientId)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">Deadline {day(t.editDate ?? t.dueDate)}</span>
                  </Link>
                ))}
                {g.list.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">ไม่มี</p>}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
