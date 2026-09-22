"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { CalendarMatrix } from "@/components/calendar/CalendarMatrix";
import { TaskModal, type TaskFormValues } from "@/components/tasks/TaskModal";
import { LoadingView } from "@/components/ui/LoadingView";
import { createTaskRow, listClients, listStaff, listTasks } from "@/lib/supabase/queries";
import type { Client, Staff, Task } from "@/lib/types";

type ModalState = "closed" | { create: { clientId?: string; date?: string } };

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>("closed");

  useEffect(() => {
    Promise.all([listTasks(), listClients(), listStaff()])
      .then(([t, c, s]) => {
        setTasks(t);
        setClients(c);
        setStaff(s);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(values: TaskFormValues) {
    const created = await createTaskRow(values);
    setTasks((prev) => [created, ...prev]);
    setModalState("closed");
  }

  if (loading) {
    return (
      <>
        <Topbar title="ปฏิทินงาน" subtitle="คิวงานของแต่ละลูกค้าตลอดทั้งเดือน" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="ปฏิทินงาน" subtitle="คิวงานของแต่ละลูกค้าตลอดทั้งเดือน" />
      <div className="flex-1 space-y-4 p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setModalState({ create: {} })}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มงานใหม่
          </button>
        </div>

        <CalendarMatrix
          tasks={tasks}
          clients={clients}
          staff={staff}
          onAddTask={(clientId, date) => setModalState({ create: { clientId, date } })}
        />
      </div>

      {modalState !== "closed" && (
        <TaskModal
          clients={clients}
          staff={staff}
          defaultClientId={modalState.create.clientId}
          defaultDate={modalState.create.date}
          onClose={() => setModalState("closed")}
          onSave={handleSave}
        />
      )}
    </>
  );
}
