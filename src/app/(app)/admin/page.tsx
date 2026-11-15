"use client";

import { useEffect, useState } from "react";
import { Bot, Building2, MessageCircle, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
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
  const [tab, setTab] = useState<"ws" | "acc">("ws");
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 text-sm font-medium sm:w-80">
          <button onClick={() => setTab("ws")} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2", tab === "ws" ? "bg-white shadow-sm" : "text-gray-500")}>
            <Building2 size={15} /> Workspace ({d.workspaces.length})
          </button>
          <button onClick={() => setTab("acc")} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2", tab === "acc" ? "bg-white shadow-sm" : "text-gray-500")}>
            <Users size={15} /> บัญชี ({d.accounts.length})
          </button>
        </div>

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
