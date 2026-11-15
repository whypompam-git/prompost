"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Building2, Check, Clock, LogIn, Plus, Users, X } from "lucide-react";
import { APP_LOGO_SRC } from "@/config/branding";
import { HANDLE_HINT, handleError, normalizeHandle, workspaceNameError } from "@/lib/workspaceRules";

type Info = {
  username: string;
  displayName: string;
  workspaces: { workspaceId: string; workspaceName: string; handle: string; role: string }[];
  requests: { id: string; status: "pending" | "approved" | "rejected"; workspaceName: string; handle: string }[];
};

const home = () => (window.matchMedia("(max-width: 767px)").matches ? "/v2/clients" : "/dashboard");

// After signing up / logging in without a workspace: Create Workspace or Join one by its ID.
export default function WelcomePage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [mode, setMode] = useState<"pick" | "create" | "join">("pick");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function load() {
    const res = await fetch("/api/onboarding", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return void (window.location.href = "/login");
    if (res?.ok) setInfo(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function enter(workspaceId: string) {
    setBusy(true);
    const res = await fetch("/api/auth/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) });
    if (res.ok) window.location.href = home();
    else setBusy(false);
  }

  async function submit(kind: "create" | "join") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/onboarding/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "create" ? { name, handle } : { handle }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setError(data?.error ?? "ไม่สำเร็จ ลองใหม่อีกครั้ง");
    if (kind === "create") window.location.href = home();
    else {
      setSent(data.workspaceName ?? handle);
      setHandle("");
      setMode("pick");
      load();
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const h = normalizeHandle(handle);
  const hErr = handle ? handleError(h) : null;
  const nErr = name ? workspaceNameError(name) : null;
  const field = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300";
  const pending = (info?.requests ?? []).filter((r) => r.status === "pending");

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
      <Image src={APP_LOGO_SRC} alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
      <h1 className="mt-3 text-lg font-semibold text-gray-900">สวัสดี {info?.displayName || info?.username || ""}</h1>
      <p className="mt-1 text-center text-sm text-gray-500">สร้าง Workspace ของคุณเอง หรือเข้าร่วม Workspace ของทีม</p>

      <div className="mt-6 w-full max-w-sm space-y-3">
        {!!info?.workspaces.length && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <p className="text-xs font-medium text-gray-500">Workspace ของคุณ</p>
            {info.workspaces.map((w) => (
              <button key={w.workspaceId} disabled={busy} onClick={() => enter(w.workspaceId)} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-left hover:bg-gray-50">
                <Building2 size={18} className="text-brand-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{w.workspaceName}</span>
                  <span className="block text-[11px] text-gray-400">{w.handle} · {w.role === "owner" ? "เจ้าของ" : "พนักงาน"}</span>
                </span>
                <LogIn size={16} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}

        {(sent || pending.length > 0) && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            {sent && <p className="mb-1 text-sm font-medium text-amber-800">ส่งคำขอเข้าร่วม "{sent}" แล้ว</p>}
            {pending.map((r) => (
              <p key={r.id} className="flex items-center gap-1.5 text-xs text-amber-700">
                <Clock size={13} /> รอเจ้าของ {r.workspaceName} ({r.handle}) อนุมัติ
              </p>
            ))}
            <button onClick={load} className="mt-2 text-xs font-medium text-amber-800 underline">เช็กอีกครั้ง</button>
          </div>
        )}

        {mode === "pick" && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setMode("create"); setError(""); }} className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-card active:scale-[0.98]">
              <Plus size={24} className="text-brand-500" />
              <span className="text-sm font-semibold text-gray-900">Create Workspace</span>
              <span className="text-[11px] text-gray-500">เป็นเจ้าของ ชวนทีมเข้ามา</span>
            </button>
            <button onClick={() => { setMode("join"); setError(""); }} className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-card active:scale-[0.98]">
              <Users size={24} className="text-brand-500" />
              <span className="text-sm font-semibold text-gray-900">Join Workspace</span>
              <span className="text-[11px] text-gray-500">ใส่ Workspace ID ของทีม</span>
            </button>
          </div>
        )}

        {mode !== "pick" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{mode === "create" ? "Create Workspace" : "Join Workspace"}</p>
              <button onClick={() => setMode("pick")} className="rounded-full p-1 text-gray-400" aria-label="ปิด"><X size={16} /></button>
            </div>
            {mode === "create" && (
              <label className="mt-3 block text-xs font-medium text-gray-500">
                ชื่อ Workspace (ชื่อบริษัท / ทีม)
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Agency 1" className={field} />
                {nErr && <span className="mt-1 block text-[11px] text-rose-600">{nErr}</span>}
              </label>
            )}
            <label className="mt-3 block text-xs font-medium text-gray-500">
              Workspace ID
              <input value={handle} onChange={(e) => setHandle(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={mode === "create" ? "เช่น agency1" : "ขอจากเจ้าของทีม"} className={field} />
              {mode === "create" && <span className={`mt-1 block text-[11px] ${hErr ? "text-rose-600" : "text-gray-400"}`}>{hErr ?? `${HANDLE_HINT} — ให้ทีมใช้รหัสนี้ตอน Join`}</span>}
            </label>
            {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
            <button
              disabled={busy || !h || (mode === "create" && (!!hErr || !name.trim() || !!nErr))}
              onClick={() => submit(mode)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Check size={16} /> {busy ? "กำลังดำเนินการ…" : mode === "create" ? "สร้าง Workspace" : "ส่งคำขอเข้าร่วม"}
            </button>
          </div>
        )}

        <button onClick={logout} className="w-full py-2 text-center text-xs text-gray-400">ออกจากระบบ</button>
      </div>
    </div>
  );
}
