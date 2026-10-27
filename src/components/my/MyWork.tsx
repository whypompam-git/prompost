"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, ChevronRight, ExternalLink, Loader2, LogOut, Send } from "lucide-react";
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
        <Deadline label="ตัดต่อ" date={t.editDate} />
        <Deadline label="ส่ง" date={t.dueDate} />
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

// The only screen for people locked to their own work (outsourced editors).
export function MyWork({ name }: { name: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<Record<string, boolean>>({});

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
    g.todo.sort((a, b) => (a.editDate ?? "9999").localeCompare(b.editDate ?? "9999") || a.dueDate.localeCompare(b.dueDate));
    g.revise.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    g.done.reverse();
    return g;
  }, [tasks]);

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

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {tasks === null && !error && <p className="py-10 text-center text-sm text-gray-400">กำลังโหลด…</p>}
        {tasks !== null && tasks.length === 0 && <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">ยังไม่มีงานที่มอบหมายให้คุณ</p>}
        {SECTIONS.map((s) => {
          const list = grouped[s.key];
          if (list.length === 0) return null;
          const isOpen = opened[s.key] ?? s.open;
          return (
            <section key={s.key}>
              <button onClick={() => setOpened((p) => ({ ...p, [s.key]: !isOpen }))} className="mb-2 flex w-full items-baseline gap-2 text-left">
                {isOpen ? <ChevronDown size={15} className="self-center text-gray-400" /> : <ChevronRight size={15} className="self-center text-gray-400" />}
                <h2 className={cn("text-sm font-semibold", s.tone)}>{s.title} ({list.length})</h2>
                {s.hint && <span className="text-xs text-gray-400">{s.hint}</span>}
              </button>
              {isOpen && (
                <div className="space-y-3">
                  {list.map((t) => (
                    <TaskCard key={t.id} t={t} onChange={load} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
