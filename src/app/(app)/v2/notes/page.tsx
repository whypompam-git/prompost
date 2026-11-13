"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pin, Search, SquarePen } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAuth } from "@/lib/auth/AuthContext";
import { listClients, listStaff, listTeamNotes, type TeamNote } from "@/lib/supabase/queries";
import type { Client, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

const KEY = "prompost:notes-scope";

const firstLine = (body: string) => body.trim().split("\n")[0]?.replace(/[*=]/g, "").trim() || "โน้ตใหม่";
const preview = (body: string) => body.trim().split("\n").slice(1).join(" ").replace(/[*=]/g, "").trim();

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function bucket(iso: string): string {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return days < 1 && new Date(iso).toDateString() === new Date().toDateString() ? "วันนี้" : days < 7 ? "7 วันที่ผ่านมา" : "ก่อนหน้านั้น";
}

// New UI: team notes, like iPhone Notes — mine or everyone's, search, pinned on top.
export default function V2NotesPage() {
  const auth = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "all") setScope("all");
    } catch {}
    Promise.all([listTeamNotes(), listStaff().catch(() => [] as Staff[]), listClients().catch(() => [] as Client[])])
      .then(([n, s, c]) => {
        setNotes(n);
        setStaff(s);
        setClients(c);
      })
      .finally(() => setLoading(false));
  }, []);

  function pickScope(s: "mine" | "all") {
    setScope(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {}
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => scope === "all" || n.authorId === auth.staffId)
      .filter((n) => n.body.trim() || n.images.length) // empty drafts stay hidden
      .filter((n) => !q || n.body.toLowerCase().includes(q) || (clients.find((c) => c.id === n.clientId)?.name ?? "").toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, scope, query, auth.staffId, clients]);

  const groups = useMemo(() => {
    const out: { title: string; list: TeamNote[] }[] = [];
    for (const n of shown) {
      const title = n.pinned ? "ปักหมุด" : bucket(n.updatedAt);
      const g = out.find((x) => x.title === title);
      if (g) g.list.push(n);
      else out.push({ title, list: [n] });
    }
    return out;
  }, [shown]);

  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? "";
  const clientOf = (id: string | null) => (id ? clients.find((c) => c.id === id)?.name : undefined);

  return (
    <>
      <Topbar title="โน้ต" subtitle={`${shown.length} โน้ต`} />
      <div className="flex-1 space-y-3 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:max-w-xs">
            {([["mine", "ของฉัน"], ["all", "ทั้งหมด"]] as const).map(([s, label]) => (
              <button key={s} onClick={() => pickScope(s)} className={cn("rounded-lg py-1.5 text-sm font-medium", scope === s ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => router.push("/v2/notes/new")} className="ml-auto rounded-xl bg-brand-500 p-2.5 text-white hover:bg-brand-600" aria-label="โน้ตใหม่">
            <SquarePen size={18} />
          </button>
        </div>
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาโน้ต" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </label>

        {loading ? (
          <LoadingView />
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">ยังไม่มีโน้ต — กดปุ่ม + เพื่อเริ่มจด</p>
        ) : (
          groups.map((g) => (
            <section key={g.title}>
              <h2 className="mb-1.5 mt-2 flex items-center gap-1 px-1 text-xs font-semibold text-gray-500">
                {g.title === "ปักหมุด" && <Pin size={12} />}
                {g.title}
              </h2>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                {g.list.map((n) => (
                  <Link key={n.id} href={`/v2/notes/${n.id}`} className="block px-4 py-3 hover:bg-gray-50">
                    <p className="truncate text-sm font-semibold text-gray-900">{firstLine(n.body)}</p>
                    <p className="mt-0.5 flex gap-2 text-xs text-gray-500">
                      <span className="shrink-0">{when(n.updatedAt)}</span>
                      <span className="truncate">{preview(n.body) || (n.images.length ? "มีรูป" : "ไม่มีข้อความเพิ่ม")}</span>
                    </p>
                    {(scope === "all" || n.clientId) && (
                      <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        {scope === "all" && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{nameOf(n.authorId)}</span>}
                        {clientOf(n.clientId) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{clientOf(n.clientId)}</span>}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
