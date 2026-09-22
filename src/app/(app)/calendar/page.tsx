"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { CalendarMatrix } from "@/components/calendar/CalendarMatrix";
import { TaskModal, type TaskFormValues } from "@/components/tasks/TaskModal";
import { mockClients, mockStaff, mockTasks } from "@/lib/mock-data";
import type { Task } from "@/lib/types";

type ModalState = "closed" | { create: { clientId?: string; date?: string } };

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [modalState, setModalState] = useState<ModalState>("closed");

  function handleSave(values: TaskFormValues) {
    setTasks((prev) => [{ ...values, id: crypto.randomUUID() }, ...prev]);
    // TODO: persist via Supabase
    setModalState("closed");
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
          clients={mockClients}
          staff={mockStaff}
          onAddTask={(clientId, date) => setModalState({ create: { clientId, date } })}
        />
      </div>

      {modalState !== "closed" && (
        <TaskModal
          clients={mockClients}
          staff={mockStaff}
          defaultClientId={modalState.create.clientId}
          defaultDate={modalState.create.date}
          onClose={() => setModalState("closed")}
          onSave={handleSave}
        />
      )}
    </>
  );
}
