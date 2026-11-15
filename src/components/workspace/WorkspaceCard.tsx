"use client";

import { useEffect, useState } from "react";
import { Building2, Check, Copy, UserPlus, X } from "lucide-react";

type Data = {
  name: string;
  handle: string;
  joinOpen: boolean;
  aiEnabled: boolean;
  lineEnabled: boolean;
  requests: { id: string; username: string; displayName: string; createdAt: string }[];
};

// Owner, Settings → พนักงาน: the Workspace ID to give the team, open/close joining, and
// approve / decline people who asked to join. Approved people appear in the staff list
// (no special permissions yet — set their position and permissions there).
export function WorkspaceCard({ onApproved }: { onApproved?: () => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch("/api/workspace", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setD(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    const res = await fetch("/api/workspace/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return window.alert(data.error ?? "ไม่สำเร็จ");
    await load();
    if (action === "approve") onApproved?.();
  }

  async function setJoinOpen(joinOpen: boolean) {
    setD((x) => (x ? { ...x, joinOpen } : x));
    await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ joinOpen }) });
  }

  async function copy() {
    if (!d) return;
    await navigator.clipboard?.writeText(d.handle).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!d) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <Building2 size={20} className="text-brand-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{d.name}</p>
          <p className="text-xs text-gray-500">
            Workspace ID: <b className="font-mono text-gray-800">{d.handle}</b>
            <button onClick={copy} className="ml-1.5 inline-flex items-center gap-0.5 text-brand-600">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "คัดลอกแล้ว" : "คัดลอก"}
            </button>
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={d.joinOpen} onChange={(e) => setJoinOpen(e.target.checked)} className="h-4 w-4 accent-orange-500" />
          เปิดรับคนขอเข้าร่วม
        </label>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        ให้พนักงานสมัครที่ prompost.app/signup แล้วกด Join Workspace ใส่ ID นี้ · AI {d.aiEnabled ? "เปิด" : "ปิด"} · LINE {d.lineEnabled ? "เปิด" : "ปิด"}
      </p>

      {d.requests.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <UserPlus size={14} /> ขอเข้าร่วม ({d.requests.length})
          </p>
          {d.requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{r.displayName || r.username}</p>
                <p className="text-[11px] text-gray-400">ชื่อผู้ใช้ {r.username} · {new Date(r.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</p>
              </div>
              <button disabled={busy === r.id} onClick={() => decide(r.id, "approve")} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                อนุมัติ
              </button>
              <button disabled={busy === r.id} onClick={() => window.confirm(`ปฏิเสธ ${r.displayName || r.username}?`) && decide(r.id, "reject")} className="rounded-lg px-2 py-1.5 text-xs text-rose-500" aria-label="ปฏิเสธ">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
