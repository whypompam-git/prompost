"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, ListChecks, Loader2, LogOut, Send } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ScriptText } from "@/components/ui/ScriptText";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";
import { bucketOf, type MyBucket, type MyTask } from "@/lib/myWorkTypes";
import { cn } from "@/lib/utils";

const SECTIONS: { key: MyBucket; title: string; hint?: string; tone: string; open: boolean }[] = [
  { key: "revise", title: "ต้องแก้", hint: "ถูกส่งกลับมาพร้อมบรีฟ", tone: "text-rose-600", open: true },
  { key: "todo", title: "ต้องทำ", hint: "เรียงตามวันตัดต่อ", tone: "text-gray-800", open: true },
  { key: "review", title: "ส่งตรวจแล้ว", hint: "รอผู้รับผิดชอบ/ลูกค้าตรวจ", tone: "text-amber-600", open: true },
  { key: "done", title: "เสร็จแล้ว", tone: "text-emerald-600", open: false },
];

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "—");
const todayIso = () => new Date().toISOString().slice(0, 10);
const withScheme = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function Deadline({ label, date }: { label: string; date?: string | null }) {
  const late = !!date && date < todayIso();
  const today = date === todayIso();
  return (
    <span className={cn("rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600", late && "bg-rose-100 text-rose-700", today && "bg-orange-100 text-orange-700")}>
      {label} {fmt(date)}
    </span>
  );
}

function LinkBtn({ label, url }: { label: string; url?: string | null }) {
  if (!url) return null;
  return (
    <a href={withScheme(url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100">
      <ExternalLink size={12} /> {label}
    </a>
  );
}

function TaskCard({ t, onChange }: { t: MyTask; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finalDraft, setFinalDraft] = useState(t.finalUrl ?? "");
  const editable = t.type === "edit" || t.type === "qc";
  const canSubmit = t.type === "edit";

  async function post(path: string, body: object) {
    setBusy(true);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) window.alert(data.error ?? "ไม่สำเร็จ ลองใหม่อีกครั้ง");
      else onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("rounded-2xl border bg-white p-4 shadow-card", t.type === "edit" && t.revisionCount > 0 ? "border-rose-200" : "border-gray-100")}>
      <p className="text-xs font-medium text-gray-400">{t.clientName}</p>
      <p className="text-base font-semibold text-gray-900">{t.title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Deadline label="ส่งงานภายใน" date={t.editDate} />
        {t.revisionCount > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-medium text-rose-700">แก้รอบที่ {t.revisionCount}</span>}
      </div>

      {t.type === "edit" && t.revisionCount > 0 && t.revisionBrief && (
        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
          <p className="text-xs font-semibold text-rose-700">บรีฟแก้</p>
          <p className="whitespace-pre-wrap text-sm text-gray-800">{t.revisionBrief}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <LinkBtn label="ฟุตเทจ" url={t.footageUrl} />
        <LinkBtn label="Ref" url={t.refLink} />
        <LinkBtn label="งานที่ส่ง (Final)" url={t.finalUrl} />
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} รายละเอียด / สคริปต์
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          {t.scriptText ? <ScriptText text={t.scriptText} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700" /> : <p className="text-sm text-gray-400">ยังไม่มีสคริปต์</p>}
          {t.shots.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Shot list</p>
              <ul className="list-inside list-decimal space-y-0.5 text-sm text-gray-700">{t.shots.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {t.notes && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">โน้ต</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{t.notes}</p>
            </div>
          )}
        </div>
      )}

      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <input
            value={finalDraft}
            onChange={(e) => setFinalDraft(e.target.value)}
            onBlur={() => finalDraft.trim() !== (t.finalUrl ?? "") && post("/api/my/final", { taskId: t.id, finalUrl: finalDraft.trim() || null })}
            placeholder="วางลิงก์ Drive ของงานที่ตัดเสร็จ"
            className="min-w-[180px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          {canSubmit && (
            <button
              disabled={busy || !finalDraft.trim()}
              onClick={() => window.confirm(`ส่ง "${t.title}" ให้ตรวจ? ส่งแล้วจะถอนกลับเองไม่ได้`) && post("/api/my/submit", { taskId: t.id })}
              title={finalDraft.trim() ? "" : "ใส่ลิงก์งานที่ตัดเสร็จก่อน"}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              ส่งงาน
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

// The editor's own calendar: the days they work on a clip (วันตัดต่อ) and the
// delivery deadlines of clips that are still theirs to finish. Tap a day to see
// its clips below.
function MyCalendar({ tasks, onChange }: { tasks: MyTask[]; onChange: () => void }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [day, setDay] = useState<string | null>(todayIso());
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }) });
  const working = tasks.filter((t) => t.type === "edit" || t.type === "qc");
  const editOn = (iso: string) => working.filter((t) => t.editDate === iso);
  const dayTasks = day ? editOn(day) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{format(anchor, "MMMM yyyy", { locale: th })}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setAnchor((a) => addMonths(a, -1))} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500" aria-label="เดือนก่อน"><ChevronLeft size={16} /></button>
          <button onClick={() => { setAnchor(new Date()); setDay(todayIso()); }} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">วันนี้</button>
          <button onClick={() => setAnchor((a) => addMonths(a, 1))} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500" aria-label="เดือนถัดไป"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="grid grid-cols-7 border-b border-gray-100 text-center text-[11px] font-medium text-gray-400">
          {WEEKDAYS.map((d) => <div key={d} className="py-1.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const e = editOn(iso).length;
            const isToday = iso === todayIso();
            return (
              <button
                key={iso}
                onClick={() => setDay(iso)}
                className={cn("flex min-h-[64px] flex-col items-center gap-0.5 border-b border-r border-gray-50 p-1 text-xs", !isSameMonth(d, anchor) && "bg-gray-50/70 text-gray-300", day === iso && "bg-brand-50 ring-1 ring-inset ring-brand-300")}
              >
                <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-medium", isToday ? "bg-brand-500 text-white" : "text-gray-600")}>{d.getDate()}</span>
                {e > 0 && <span className="w-full truncate rounded bg-sky-100 px-1 text-[10px] font-medium text-sky-700">{e} งาน</span>}
              </button>
            );
          })}
        </div>
      </div>
      <p className="flex gap-3 text-[11px] text-gray-400">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />วันที่ต้องตัดและส่งงาน</span>
      </p>
      {day && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{format(new Date(day), "d MMMM", { locale: th })} · {dayTasks.length} งาน</h3>
          <div className="space-y-3">
            {dayTasks.map((t) => <TaskCard key={t.id} t={t} onChange={onChange} />)}
            {dayTasks.length === 0 && <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">ไม่มีงานในวันนี้</p>}
          </div>
        </section>
      )}
    </div>
  );
}

// The only screen for people locked to their own work (outsourced editors).
export function MyWork({ name }: { name: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<MyBucket | "all" | null>(null); // null = not chosen yet → best default

  async function load() {
    try {
      const res = await fetch("/api/my/tasks", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setTasks(data.tasks);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    return () => clearInterval(t);
  }, []);

  const grouped = useMemo(() => {
    const g: Record<MyBucket, MyTask[]> = { revise: [], todo: [], review: [], done: [] };
    for (const t of tasks ?? []) g[bucketOf(t)].push(t);
    g.todo.sort((a, b) => (a.editDate ?? "9999").localeCompare(b.editDate ?? "9999"));
    g.revise.sort((a, b) => (a.editDate ?? "9999").localeCompare(b.editDate ?? "9999"));
    g.done.reverse();
    return g;
  }, [tasks]);

  // first visit: jump to what needs attention (sent-back work first, then to-do)
  const active: MyBucket | "all" = filter ?? (grouped.revise.length > 0 ? "revise" : grouped.todo.length > 0 ? "todo" : "all");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src={APP_LOGO_SRC} alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
          <div>
            <p className="text-sm font-semibold leading-tight text-gray-900">งานของฉัน</p>
            <p className="text-xs leading-tight text-gray-500">{name} · {APP_NAME}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            aria-label="ออกจากระบบ"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="mx-auto flex max-w-3xl gap-2 px-4 pt-4">
        {([["list", "งานของฉัน", ListChecks], ["calendar", "ปฏิทิน", CalendarDays]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn("flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium", view === key ? "bg-brand-500 text-white" : "bg-white text-gray-600 border border-gray-200")}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-4">
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {tasks === null && !error && <p className="py-10 text-center text-sm text-gray-400">กำลังโหลด…</p>}
        {tasks !== null && view === "list" && tasks.length === 0 && <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">ยังไม่มีงานที่มอบหมายให้คุณ</p>}
        {tasks !== null && view === "calendar" && <MyCalendar tasks={tasks} onChange={load} />}
        {tasks !== null && view === "list" && tasks.length > 0 && (
          <>
            {/* filter chips, like the dashboard's stage filter */}
            <div className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-gray-50/95 px-4 py-2 backdrop-blur">
              <button
                onClick={() => setFilter("all")}
                className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", active === "all" ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600")}
              >
                ทั้งหมด {tasks.length}
              </button>
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilter(s.key)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
                    active === s.key ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600",
                    active !== s.key && s.key === "revise" && grouped.revise.length > 0 && "border-rose-200 bg-rose-50 text-rose-600",
                    grouped[s.key].length === 0 && "opacity-40",
                  )}
                >
                  {s.title} {grouped[s.key].length}
                </button>
              ))}
            </div>
            {SECTIONS.filter((s) => active === "all" || active === s.key).map((s) => {
              const list = grouped[s.key];
              if (list.length === 0) return active === s.key ? <p key={s.key} className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">ไม่มีงานในกลุ่ม "{s.title}"</p> : null;
              return (
                <section key={s.key}>
                  {active === "all" && <h2 className={cn("mb-2 text-sm font-semibold", s.tone)}>{s.title} ({list.length}) {s.hint && <span className="text-xs font-normal text-gray-400">{s.hint}</span>}</h2>}
                  <div className="space-y-3">
                    {list.map((t) => (
                      <TaskCard key={t.id} t={t} onChange={load} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
