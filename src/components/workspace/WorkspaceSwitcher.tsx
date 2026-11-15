"use client";

import { useEffect, useState } from "react";
import { Building2, Check, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

type W = { workspaceId: string; workspaceName: string; handle: string; role: string };

// Profile: which workspace you're in, switch to another one you belong to, or create / join more.
export function WorkspaceSwitcher() {
  const auth = useAuth();
  const [list, setList] = useState<W[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/auth/switch", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)), fetch("/api/workspace/current", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))])
      .then(([a, b]) => {
        setList(a?.workspaces ?? []);
        setCurrent(b?.workspaceId ?? null);
      })
      .catch(() => setList([]));
  }, [auth.staffId]);

  async function go(workspaceId: string) {
    setBusy(true);
    const res = await fetch("/api/auth/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) });
    if (res.ok) window.location.href = window.matchMedia("(max-width: 767px)").matches ? "/v2/clients" : "/dashboard";
    else setBusy(false);
  }

  if (!list) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><Building2 size={14} /> Workspace</p>
      {list.map((w) => (
        <button key={w.workspaceId} disabled={busy || w.workspaceId === current} onClick={() => go(w.workspaceId)} className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-gray-50 disabled:hover:bg-transparent">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900">{w.workspaceName}</span>
            <span className="block text-[11px] text-gray-400">{w.handle} · {w.role === "owner" ? "เจ้าของ" : "พนักงาน"}</span>
          </span>
          {w.workspaceId === current ? <Check size={16} className="text-brand-500" /> : <span className="text-xs text-brand-600">สลับ</span>}
        </button>
      ))}
      <a href="/welcome" className="mt-2 flex items-center gap-1.5 px-2 text-xs font-medium text-brand-600">
        <Plus size={14} /> สร้าง / เข้าร่วม Workspace อื่น
      </a>
    </div>
  );
}
