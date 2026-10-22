"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Topbar } from "@/components/layout/Topbar";
import { ClientMultiFilter } from "@/components/dashboard/ClientMultiFilter";
import { LoadingView } from "@/components/ui/LoadingView";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { bangkokDay } from "@/lib/alerts";
import { PALETTE, pillClass, type ColorStem } from "@/lib/colors";
import { listClients, listQueues, listStaff, listTasks, listTeams } from "@/lib/supabase/queries";
import type { Client, Queue, Staff, Task, Team } from "@/lib/types";
import { buildWorkBoard, type CardKind, type WorkCard } from "@/lib/workload";
import { cn } from "@/lib/utils";

const KIND: Record<CardKind, { label: string; color: ColorStem }> = {
  shoot: { label: "ถ่ายทำ", color: "sky" },
  edit: { label: "ตัดต่อ", color: "orange" },
  qc: { label: "QC", color: "amber" },
  other: { label: "อื่นๆ", color: "gray" },
  delivery: { label: "ส่งงาน", color: "rose" },
};

const short = (iso: string) => format(new Date(iso), "d MMM", { locale: th });

function Card({ card, clientName, today }: { card: WorkCard; clientName: string; today: string }) {
  const k = KIND[card.kind];
  // delivery deadline: red when late, orange when due today
  const late = card.deadline < today;
  const soon = card.deadline === today;
  return (
    <Link
      href={card.href}
      title={card.titles.slice(0, 12).join("\n")}
      className={cn("block rounded-lg px-2 py-1 leading-tight hover:brightness-95", pillClass(k.color))}
    >
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold">
        <span className="flex min-w-0 items-center gap-1">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PALETTE[k.color].solid)} />
          <span className="truncate">
            {k.label} · {clientName}
          </span>
        </span>
        <span className={cn("shrink-0 font-medium", late ? "text-rose-600" : soon ? "text-orange-600" : "opacity-70")}>
          {card.kind === "delivery" ? short(card.deadline) : `ส่ง ${short(card.deadline)}`}
        </span>
      </span>
      <span className="block truncate text-[10px] font-normal opacity-80">{card.title}</span>
    </Link>
  );
}

export default function WorkloadPage() {
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
  const [tab, setTab] = useState("");

  useEffect(() => {
    Promise.all([listTasks(), listClients(), listStaff(), listQueues().catch(() => [] as Queue[]), listTeams().catch(() => [] as Team[])])
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

  const rows = useMemo(() => {
    let people = staff;
    if (teamFilter) people = people.filter((s) => s.teamId === teamFilter);
    if (personFilter) people = people.filter((s) => s.id === personFilter);
    const hasCards = new Set(board.cards.map((c) => c.rowId));
    const list = people
      .filter((s) => showAll || hasCards.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, staff: s as Staff | null }));
    if (!teamFilter && !personFilter && hasCards.has("none")) list.push({ id: "none", name: "ยังไม่มีคนรับ", staff: null });
    return list;
  }, [staff, board, teamFilter, personFilter, showAll]);

  const columnLabel = (col: string) => {
    if (col === "overdue") return "เลยกำหนด";
    if (col === today) return "วันนี้";
    return format(new Date(col), "EEE d MMM", { locale: th });
  };
  const activeTab = board.columns.includes(tab) ? tab : board.columns.find((c) => c === today) ?? board.columns[0];

  if (loading) {
    return (
      <>
        <Topbar title="สรุปงาน" subtitle="ใครทำอะไร วันไหน" />
        <LoadingView />
      </>
    );
  }

  const cardsAt = (rowId: string, col: string) => board.cards.filter((c) => c.rowId === rowId && c.column === col);
  const waiting = board.waiting.filter((w) => !clientFilter.length || clientFilter.includes(w.clientId));

  return (
    <>
      <Topbar title="สรุปงาน" subtitle="ใครทำอะไรอยู่ และมีงานอะไรรออยู่" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
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

        <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
          {(Object.keys(KIND) as CardKind[]).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", PALETTE[KIND[k].color].solid)} />
              {KIND[k].label}
            </span>
          ))}
          <span className="text-gray-400">· ถ่าย/ตัดต่อ ขึ้นตามวันลงมือทำ · ส่งงาน ขึ้นที่แถวผู้ดูแลลูกค้า ตามวันส่ง</span>
        </div>

        {/* desktop: people × days */}
        <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card md:block">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-36 border-b border-r border-gray-100 bg-white px-3 py-2.5 text-xs font-medium text-gray-400">คน</th>
                {board.columns.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "min-w-[150px] border-b border-gray-100 px-2 py-2.5 text-xs font-semibold",
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
                  <td className="sticky left-0 z-10 border-b border-r border-gray-100 bg-white px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      {r.staff ? <StaffAvatar staff={r.staff} className="h-7 w-7 text-xs" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">?</span>}
                      <span className="truncate text-sm font-medium text-gray-800">{r.name}</span>
                    </div>
                  </td>
                  {board.columns.map((col) => (
                    <td key={col} className={cn("border-b border-gray-100 px-1.5 py-1.5 align-top", col === "overdue" && "bg-rose-50/30", col === today && "bg-brand-50/30")}>
                      <div className="flex flex-col gap-1">
                        {cardsAt(r.id, col).map((c) => (
                          <Card key={c.key} card={c} clientName={clientName(c.clientId)} today={today} />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={board.columns.length + 1} className="px-5 py-10 text-center text-sm text-gray-400">
                    ไม่มีงานในช่วงนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* phone: one day at a time, grouped by person */}
        <div className="md:hidden">
          <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {board.columns.map((col) => {
              const n = board.cards.filter((c) => c.column === col).length;
              return (
                <button
                  key={col}
                  onClick={() => setTab(col)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                    activeTab === col ? "border-brand-500 bg-brand-500 text-white" : col === "overdue" && n > 0 ? "border-rose-200 bg-rose-50 text-rose-600" : "border-gray-200 bg-white text-gray-600",
                  )}
                >
                  {columnLabel(col)} {n > 0 && <span className="opacity-70">({n})</span>}
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            {rows
              .filter((r) => cardsAt(r.id, activeTab).length > 0)
              .map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
                  <div className="mb-2 flex items-center gap-2">
                    {r.staff ? <StaffAvatar staff={r.staff} className="h-6 w-6 text-[11px]" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[11px] text-gray-500">?</span>}
                    <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {cardsAt(r.id, activeTab).map((c) => (
                      <Card key={c.key} card={c} clientName={clientName(c.clientId)} today={today} />
                    ))}
                  </div>
                </div>
              ))}
            {rows.every((r) => cardsAt(r.id, activeTab).length === 0) && (
              <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">ไม่มีงานในวันนี้</p>
            )}
          </div>
        </div>

        {/* waiting */}
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
    </>
  );
}
