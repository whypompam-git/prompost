"use client";

import { useEffect, useState } from "react";
import { ArchiveRestore, Bot, Building2, MessageCircle, Search, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { cn } from "@/lib/utils";

type Ws = { id: string; name: string; handle: string; aiEnabled: boolean; lineEnabled: boolean; joinOpen: boolean; createdAt: string; owners: string[]; members: number; clients: number; tasks: number; pending: number };
type Acc = { id: string; username: string; displayName: string; isPlatformAdmin: boolean; createdAt: string; workspaces: string[] };
type Data = { me: string; workspaces: Ws[]; accounts: Acc[] };

const PROMPOST = "00000000-0000-4000-8000-000000000001";
const thDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

// Platform admin: every workspace (switch AI / LINE / joining, delete test ones) and every login.
export default function AdminPage() {
  const [d, setD] = useState<Data | null>(null);
  const [denied, setDenied] = useState("");
  const [tab, setTab] = useState<"ws" | "acc" | "restore">("ws");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ file: string; takenAt: string; clients: { id: string; name: string; nameEn: string | null; slug: string | null; tasks: number; existsNow: boolean }[] }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState("");

  async function search() {
    setSearching(true);
    setMsg("");
    setFound(null);
    const res = await fetch(`/api/admin/backups?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setSearching(false);
    if (!res.ok) return setMsg(data.error ?? "ค้นหาไม่สำเร็จ");
    setFound(data.results);
  }

  async function restore(file: string, c: { id: string; name: string; tasks: number }) {
    if (!window.confirm(`กู้ "${c.name}" (งาน ${c.tasks} ชิ้น) จาก ${file}? ข้อมูลที่ยังอยู่จะไม่ถูกเขียนทับ — ไฟล์ดราฟวิดีโอที่ลบไปแล้วกู้ไม่ได้`)) return;
    setBusy(c.id);
    const res = await fetch("/api/admin/backups/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file, clientId: c.id }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return window.alert(data.error ?? "กู้ไม่สำเร็จ");
    setMsg(`กู้ "${c.name}" แล้ว: ${Object.entries(data.restored as Record<string, number>).map(([t, n]) => `${t} ${n}`).join(", ")}`);
    search();
  }
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setDenied(data.error ?? "ไม่มีสิทธิ์");
    setD(data);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(w: Ws, key: "aiEnabled" | "lineEnabled" | "joinOpen") {
    setD((x) => (x ? { ...x, workspaces: x.workspaces.map((y) => (y.id === w.id ? { ...y, [key]: !y[key] } : y)) } : x));
    const res = await fetch("/api/admin/workspaces", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: w.id, [key]: !w[key] }) });
    if (!res.ok) {
      window.alert("บันทึกไม่สำเร็จ");
      load();
    }
  }

  async function removeWs(w: Ws) {
    const confirm = window.prompt(`ลบ Workspace "${w.name}" และข้อมูลทั้งหมดในนั้น (ลูกค้า ${w.clients}, งาน ${w.tasks}) — กู้คืนไม่ได้\nพิมพ์ Workspace ID "${w.handle}" เพื่อยืนยัน`);
    if (confirm === null) return;
    setBusy(w.id);
    const res = await fetch("/api/admin/workspaces", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: w.id, confirm: confirm.trim() }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return window.alert(data.error ?? "ลบไม่สำเร็จ");
    load();
  }

  async function removeAcc(a: Acc) {
    if (!window.confirm(`ลบบัญชี "${a.username}"? เข้าระบบด้วยบัญชีนี้ไม่ได้อีก (ประวัติงานยังอยู่) — กู้คืนไม่ได้`)) return;
    setBusy(a.id);
    const res = await fetch("/api/admin/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return window.alert(data.error ?? "ลบไม่สำเร็จ");
    load();
  }

  if (denied) return <><Topbar title="ผู้ดูแลระบบ" /><p className="p-6 text-sm text-gray-500">{denied}</p></>;
  if (!d) return <LoadingView />;

  const Switch = ({ on, onClick, icon: Icon, label }: { on: boolean; onClick: () => void; icon: typeof Bot; label: string }) => (
    <button onClick={onClick} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", on ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400")}>
      <Icon size={12} /> {label} {on ? "เปิด" : "ปิด"}
    </button>
  );

  return (
    <>
      <Topbar title="ผู้ดูแลระบบ" subtitle="ทุก Workspace และทุกบัญชีในระบบ" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 text-sm font-medium sm:w-[28rem]">
          <button onClick={() => setTab("ws")} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2", tab === "ws" ? "bg-white shadow-sm" : "text-gray-500")}>
            <Building2 size={15} /> Workspace ({d.workspaces.length})
          </button>
          <button onClick={() => setTab("acc")} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2", tab === "acc" ? "bg-white shadow-sm" : "text-gray-500")}>
            <Users size={15} /> บัญชี ({d.accounts.length})
          </button>
          <button onClick={() => setTab("restore")} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2", tab === "restore" ? "bg-white shadow-sm" : "text-gray-500")}>
            <ArchiveRestore size={15} /> กู้ข้อมูล
          </button>
        </div>

        {tab === "restore" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">ค้นลูกค้าใน backup ทุกไฟล์ (ชื่อไทย / อังกฤษ / ชื่อลิงก์) เพื่อดูว่าหายไปเมื่อไหร่ และกู้กลับพร้อมงานทั้งหมด</p>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim().length >= 2 && search()} placeholder="ชื่อลูกค้า" className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              <button disabled={searching || q.trim().length < 2} onClick={search} className="flex items-center gap-1 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white disabled:opacity-50">
                <Search size={15} /> {searching ? "กำลังค้น…" : "ค้นหา"}
              </button>
            </div>
            {msg && <p className="text-sm text-emerald-700">{msg}</p>}
            {found && (
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-card">
                {found.map((f) => (
                  <div key={f.file} className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-500">{f.file} · ถ่ายเมื่อ {new Date(f.takenAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</p>
                    {f.clients.length === 0 && <p className="mt-1 text-sm text-gray-400">ไม่พบ</p>}
                    {f.clients.map((c) => (
                      <div key={c.id} className="mt-1.5 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm text-gray-900">
                          {c.name} {c.nameEn && <span className="text-gray-400">({c.nameEn})</span>} · งาน {c.tasks}
                          {c.existsNow ? <span className="ml-1 text-emerald-600">· ยังอยู่ในระบบ</span> : <span className="ml-1 text-rose-600">· ถูกลบไปแล้ว</span>}
                        </p>
                        {!c.existsNow && (
                          <button disabled={busy === c.id} onClick={() => restore(f.file, c)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                            กู้จากไฟล์นี้
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "ws" && (
          <div className="grid gap-3 lg:grid-cols-2">
            {d.workspaces.map((w) => (
              <div key={w.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-mono">{w.handle}</span> · สร้าง {thDate(w.createdAt)} · เจ้าของ {w.owners.join(", ") || "—"}
                    </p>
                  </div>
                  {w.id !== PROMPOST && (
                    <button disabled={busy === w.id} onClick={() => removeWs(w)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500" aria-label="ลบ Workspace">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  สมาชิก {w.members} · ลูกค้า {w.clients} · งาน {w.tasks}
                  {w.pending > 0 && <span className="ml-1 text-amber-600">· รออนุมัติ {w.pending}</span>}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Switch on={w.aiEnabled} onClick={() => toggle(w, "aiEnabled")} icon={Bot} label="AI" />
                  <Switch on={w.lineEnabled} onClick={() => toggle(w, "lineEnabled")} icon={MessageCircle} label="LINE" />
                  <Switch on={w.joinOpen} onClick={() => toggle(w, "joinOpen")} icon={UserPlus} label="รับคนเข้าร่วม" />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "acc" && (
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-card">
            {d.accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900">
                    {a.username}
                    {a.displayName && <span className="font-normal text-gray-400">· {a.displayName}</span>}
                    {a.isPlatformAdmin && <ShieldCheck size={14} className="text-brand-500" />}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {a.workspaces.length ? a.workspaces.join(", ") : "ยังไม่อยู่ใน Workspace ไหน"} · สมัคร {thDate(a.createdAt)}
                  </p>
                </div>
                {!a.isPlatformAdmin && a.id !== d.me && (
                  <button disabled={busy === a.id} onClick={() => removeAcc(a)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500" aria-label="ลบบัญชี">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
