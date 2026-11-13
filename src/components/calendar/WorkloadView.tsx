"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { ClientMultiFilter } from "@/components/dashboard/ClientMultiFilter";
import { LoadingView } from "@/components/ui/LoadingView";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { bangkokDay } from "@/lib/alerts";
import { PALETTE, pillClass, type ColorStem } from "@/lib/colors";
import { listClients, listQueues, listStaff, listTasksLite, listTeams, saveQueue, updateTaskRow } from "@/lib/supabase/queries";
import type { Client, Queue, Staff, Task, Team } from "@/lib/types";
import { buildWorkBoard, type CardKind, type WorkCard } from "@/lib/workload";
import { cn } from "@/lib/utils";

const KIND: Record<CardKind, { label: string; color: ColorStem }> = {
  shoot: { label: "ถ่ายทำ", color: "sky" },
  edit: { label: "ตัดต่อ", color: "orange" },
  qc: { label: "QC", color: "amber" },
  other: { label: "อื่นๆ", color: "gray" },
};

// top half = shooting, bottom half = editing (QC and misc work sit with editing)
const SECTIONS: { key: "shoot" | "edit"; title: string; kinds: CardKind[] }[] = [
  { key: "shoot", title: "การถ่าย", kinds: ["shoot"] },
  { key: "edit", title: "ตัดต่อ (วันตัดต่อ = Deadline ส่งลูกค้า)", kinds: ["edit", "qc", "other"] },
];

const short = (iso: string) => format(new Date(iso), "d MMM", { locale: th });

function Card({ card, clientName, today, onMove }: { card: WorkCard; clientName: string; today: string; onMove: (card: WorkCard, date: string) => void }) {
  const k = KIND[card.kind];
  const late = card.deadline < today;
  const soon = card.deadline === today;
  return (
    <div className="relative">
      <Link
        href={card.href}
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/card", card.key)}
        title={card.titles.slice(0, 12).join("\n")}
        className={cn("block cursor-grab rounded-lg py-1 pl-2 pr-7 leading-tight hover:brightness-95 active:cursor-grabbing", pillClass(k.color))}
      >
        <span className="flex items-center justify-between gap-2 text-[11px] font-semibold">
          <span className="flex min-w-0 items-center gap-1">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PALETTE[k.color].solid)} />
            <span className="truncate">
              {k.label} · {clientName}
            </span>
          </span>
          {card.kind === "shoot" && (
            <span className={cn("shrink-0 font-medium", late ? "text-rose-600" : soon ? "text-orange-600" : "opacity-70")}>ส่ง {short(card.deadline)}</span>
          )}
        </span>
        <span className="block truncate text-[10px] font-normal opacity-80">{card.title}</span>
      </Link>
      {/* phones can't drag: tap the clock to pick a new date */}
      <label className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-white/60" title="ย้ายวัน">
        <CalendarClock size={13} />
        <input
          type="date"
          aria-label="ย้ายไปวันที่"
          value=""
          onChange={(e) => e.target.value && onMove(card, e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

// "สรุปงาน": people × days, shooting on top and editing below. Drag a card (or
// use its clock button on a phone) to move what it stands for to another day.
export function WorkloadView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [teamFilter, setTeamFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [over, setOver] = useState("");

  useEffect(() => {
    Promise.all([listTasksLite(), listClients(), listStaff(), listQueues().catch(() => [] as Queue[]), listTeams().catch(() => [] as Team[])])
      .then(([t, c, s, q, tm]) => {
        setTasks(t);
        setClients(c);
        setStaff(s);
        setQueues(q);
        setTeams(tm);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = bangkokDay(new Date());
  const scoped = useMemo(() => (clientFilter.length ? tasks.filter((t) => clientFilter.includes(t.clientId)) : tasks), [tasks, clientFilter]);
  const board = useMemo(() => buildWorkBoard({ tasks: scoped, queues, clients, staff, today, days }), [scoped, queues, clients, staff, today, days]);
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  async function moveCard(card: WorkCard, date: string) {
    if (date === card.date) return;
    const snapshotTasks = tasks;
    const snapshotQueues = queues;
    try {
      const queue = card.kind === "shoot" && card.queueId ? queues.find((q) => q.id === card.queueId) : undefined;
      if (queue) {
        setQueues((prev) => prev.map((q) => (q.id === queue.id ? { ...q, shootDate: date } : q)));
        await saveQueue({ ...queue, shootDate: date });
        return;
      }
      const ids = new Set(card.taskIds);
      const patch = card.kind === "shoot" ? { scheduledDate: date } : { editDate: date };
      setTasks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, ...patch } : t)));
      await Promise.all([...ids].map((id) => updateTaskRow(id, patch)));
    } catch (err) {
      console.error(err);
      setTasks(snapshotTasks);
      setQueues(snapshotQueues);
      window.alert("ย้ายวันไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  const people = useMemo(() => {
    let list = staff;
    if (teamFilter) list = list.filter((s) => s.teamId === teamFilter);
    if (personFilter) list = list.filter((s) => s.id === personFilter);
    return list;
  }, [staff, teamFilter, personFilter]);

  const rowsFor = (kinds: CardKind[]) => {
    const has = new Set(board.cards.filter((c) => kinds.includes(c.kind)).map((c) => c.rowId));
    const list = people.filter((s) => showAll || has.has(s.id)).map((s) => ({ id: s.id, name: s.name, staff: s as Staff | null }));
    if (!teamFilter && !personFilter && has.has("none")) list.push({ id: "none", name: "ยังไม่มีคนรับ", staff: null });
    return list;
  };
  const cardsAt = (kinds: CardKind[], rowId: string, col: string) => board.cards.filter((c) => kinds.includes(c.kind) && c.rowId === rowId && c.column === col);

  const columnLabel = (col: string) => {
    if (col === "overdue") return "เลยกำหนด";
    if (col === today) return "วันนี้";
    return format(new Date(col), "EEE d MMM", { locale: th });
  };
  const waiting = board.waiting.filter((w) => !clientFilter.length || clientFilter.includes(w.clientId));

  if (loading) return <LoadingView />;

  const Avatar = ({ r, size }: { r: { staff: Staff | null }; size: string }) =>
    r.staff ? <StaffAvatar staff={r.staff} className={size} /> : <span className={cn("flex items-center justify-center rounded-full bg-gray-200 text-gray-500", size)}>?</span>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm font-medium">
          {[7, 14].map((n) => (
            <button key={n} onClick={() => setDays(n)} className={cn("rounded-md px-3 py-1.5", days === n ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50")}>
              {n} วัน
            </button>
          ))}
        </div>
        {teams.length > 0 && (
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
            <option value="">ทุกทีม</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <option value="">ทุกคน</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ClientMultiFilter clients={clients} selected={clientFilter} onChange={setClientFilter} />
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          แสดงทุกคน (รวมคนที่ว่าง)
        </label>
      </div>
      <p className="text-[11px] text-gray-400">ลากการ์ดไปวางวันอื่นเพื่อย้ายวัน · บนมือถือกดไอคอนนาฬิกาบนการ์ดแล้วเลือกวัน · การ์ดถ่ายในคิวจะย้ายวันถ่ายของทั้งคิว</p>

      {/* people × days, one table per section — same on phone and desktop (scrolls sideways on a phone) */}
      {SECTIONS.map((sec) => {
        const rows = rowsFor(sec.kinds);
        return (
          <section key={sec.key}>
            <h2 className={cn("mb-2 text-sm font-semibold", sec.key === "shoot" ? "text-sky-700" : "text-orange-700")}>{sec.title}</h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left sm:min-w-[900px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-24 border-b border-r border-gray-100 bg-white px-2 py-2.5 text-xs font-medium text-gray-400 sm:w-36 sm:px-3">คน</th>
                    {board.columns.map((col) => (
                      <th
                        key={col}
                        className={cn(
                          "min-w-[120px] border-b border-gray-100 px-2 py-2.5 text-xs font-semibold sm:min-w-[150px]",
                          col === "overdue" ? "bg-rose-50/60 text-rose-600" : col === today ? "bg-brand-50/60 text-brand-700" : "text-gray-600",
                        )}
                      >
                        {columnLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="sticky left-0 z-10 border-b border-r border-gray-100 bg-white px-2 py-2 align-top sm:px-3">
                        <div className="flex items-center gap-2">
                          <Avatar r={r} size="h-7 w-7 text-xs" />
                          <span className="truncate text-sm font-medium text-gray-800">{r.name}</span>
                        </div>
                      </td>
                      {board.columns.map((col) => {
                        const cellKey = `${sec.key}|${r.id}|${col}`;
                        return (
                          <td
                            key={col}
                            onDragOver={col === "overdue" ? undefined : (e) => { e.preventDefault(); setOver(cellKey); }}
                            onDragLeave={() => setOver((o) => (o === cellKey ? "" : o))}
                            onDrop={
                              col === "overdue"
                                ? undefined
                                : (e) => {
                                    e.preventDefault();
                                    setOver("");
                                    const card = board.cards.find((c) => c.key === e.dataTransfer.getData("text/card"));
                                    if (card) moveCard(card, col);
                                  }
                            }
                            className={cn(
                              "border-b border-gray-100 px-1.5 py-1.5 align-top",
                              col === "overdue" && "bg-rose-50/30",
                              col === today && "bg-brand-50/30",
                              over === cellKey && "ring-2 ring-inset ring-brand-300",
                            )}
                          >
                            <div className="flex min-h-[36px] flex-col gap-1">
                              {cardsAt(sec.kinds, r.id, col).map((c) => (
                                <Card key={c.key} card={c} clientName={clientName(c.clientId)} today={today} onMove={moveCard} />
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={board.columns.length + 1} className="px-5 py-6 text-center text-sm text-gray-400">
                        ไม่มีงาน{sec.key === "shoot" ? "ถ่าย" : "ตัดต่อ"}ในช่วงนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">งานรออยู่ (ยังไม่มีวัน หรือรอลูกค้า)</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {waiting.map((w) => (
              <div key={w.clientId} className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
                <Link href={`/clients/${w.clientId}`} className="text-sm font-semibold text-gray-800 hover:text-brand-600">
                  {clientName(w.clientId)}
                </Link>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium">
                  {w.unqueued > 0 && (
                    <Link href={`/clients/${w.clientId}?stage=shoot`} className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                      รอจัดคิว {w.unqueued}
                    </Link>
                  )}
                  {w.noEditDate > 0 && (
                    <Link href={`/clients/${w.clientId}?stage=edit`} className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                      รอกำหนดวันตัดต่อ {w.noEditDate}
                    </Link>
                  )}
                  {w.plan > 0 && (
                    <Link href={`/clients/${w.clientId}?stage=plan`} className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                      Plan รอลูกค้าเลือก {w.plan}
                    </Link>
                  )}
                  {w.pending > 0 && (
                    <Link href={`/clients/${w.clientId}?stage=pending`} className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                      Pending รอลูกค้าอนุมัติ {w.pending}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
