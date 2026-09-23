"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { CalendarMatrix } from "@/components/calendar/CalendarMatrix";
import { DayView } from "@/components/calendar/DayView";
import { YearView } from "@/components/calendar/YearView";
import { TaskModal, type TaskFormValues } from "@/components/tasks/TaskModal";
import { LoadingView } from "@/components/ui/LoadingView";
import { createTaskRow, listClients, listStaff, listTasks } from "@/lib/supabase/queries";
import type { Client, Staff, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type ModalState = "closed" | { create: { clientId?: string; date?: string } };
type ViewKind = "day" | "week" | "month" | "year";

const VIEW_OPTIONS: { value: ViewKind; label: string }[] = [
  { value: "day", label: "วัน" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "year", label: "ปี" },
];

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [view, setView] = useState<ViewKind>("month");
  const [anchor, setAnchor] = useState(() => new Date());

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

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) }),
    [anchor],
  );
  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(anchor, { weekStartsOn: 1 }),
      }),
    [anchor],
  );

  function goPrev() {
    setAnchor((d) =>
      view === "day" ? addDays(d, -1) : view === "week" ? addWeeks(d, -1) : view === "month" ? addMonths(d, -1) : addYears(d, -1),
    );
  }
  function goNext() {
    setAnchor((d) =>
      view === "day" ? addDays(d, 1) : view === "week" ? addWeeks(d, 1) : view === "month" ? addMonths(d, 1) : addYears(d, 1),
    );
  }

  const periodLabel =
    view === "day"
      ? format(anchor, "d MMMM yyyy", { locale: th })
      : view === "week"
        ? `${format(weekDays[0], "d MMM", { locale: th })} – ${format(weekDays[6], "d MMM yyyy", { locale: th })}`
        : view === "month"
          ? format(anchor, "MMMM yyyy", { locale: th })
          : format(anchor, "yyyy", { locale: th });

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <div className="flex overflow-hidden rounded-lg border border-gray-200">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setView(opt.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition",
                    view === opt.value ? "bg-brand-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <h2 className="mr-2 text-base font-semibold text-gray-900">{periodLabel}</h2>
            <button
              onClick={goPrev}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              วันนี้
            </button>
            <button
              onClick={goNext}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setModalState({ create: {} })}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มงานใหม่
          </button>
        </div>

        {view === "month" && (
          <CalendarMatrix
            days={monthDays}
            tasks={tasks}
            clients={clients}
            onAddTask={(clientId, date) => setModalState({ create: { clientId, date } })}
          />
        )}
        {view === "week" && (
          <CalendarMatrix
            days={weekDays}
            tasks={tasks}
            clients={clients}
            onAddTask={(clientId, date) => setModalState({ create: { clientId, date } })}
          />
        )}
        {view === "day" && (
          <DayView
            date={anchor}
            tasks={tasks.filter((t) => t.scheduledDate === format(anchor, "yyyy-MM-dd"))}
            clients={clients}
            onAddTask={(date) => setModalState({ create: { date } })}
          />
        )}
        {view === "year" && (
          <YearView
            year={startOfYear(anchor)}
            tasks={tasks}
            onSelectDay={(day) => {
              setAnchor(day);
              setView("day");
            }}
          />
        )}
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
