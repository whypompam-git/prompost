"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalMode } from "@/lib/goalProgress";

export type GoalData = {
  goal: { target: number; mode: GoalMode; startDate: string | null; setByName?: string | null } | null;
  window: { from: string; to: string | null };
  today: string;
  edit: number;
  shoot: number;
  total: number;
  locked?: boolean; // set by the owner: the person can't change it
};

const thDate = (iso: string, withYear = false) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", ...(withYear ? { year: "2-digit" } : {}) });
const thMonth = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

// "Progress Tracking": a progress bar of clips finished this month (or since a
// start date) against a target. Own card on the profile (fetches itself), or —
// with staffId + data — the owner's card for someone else.
export function GoalCard({ staffId, data, onChanged, compact }: { staffId?: string; data?: GoalData; onChanged?: () => void; compact?: boolean } = {}) {
  const [own, setOwn] = useState<GoalData | null>(null);
  const d = data ?? own;
  const [edit, setEdit] = useState(false);
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<GoalMode>("month");
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (staffId) return onChanged?.();
    try {
      const res = await fetch("/api/my/goal", { cache: "no-store" });
      if (res.ok) setOwn(await res.json());
    } catch {
      /* the card just stays hidden */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);
  useEffect(() => {
    if (!staffId) load();
  }, [load, staffId]);

  function openEdit() {
    setTarget(String(d?.goal?.target ?? 100));
    setMode(d?.goal?.mode ?? "month");
    setStart(d?.goal?.startDate ?? d?.today ?? "");
    setEdit(true);
  }

  async function save(clear = false) {
    setBusy(true);
    try {
      const body = { ...(clear ? { target: 0 } : { target: Number(target), mode, startDate: mode === "from" ? start : null }), ...(staffId ? { staffId } : {}) };
      const res = await fetch(staffId ? "/api/goals" : "/api/my/goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const resp = await res.json().catch(() => ({}));
      if (!res.ok) return window.alert(resp.error ?? "บันทึกไม่สำเร็จ");
      setEdit(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!d) return null;
  const g = d.goal;
  const pct = g ? Math.min(100, Math.round((d.total / g.target) * 100)) : 0;
  const left = g ? Math.max(0, g.target - d.total) : 0;
  const period = g?.mode === "from" && g.startDate ? `ตั้งแต่ ${thDate(g.startDate, true)} ถึงวันนี้` : `เดือน${thMonth(d.window.from)}`;
  const daysLeft = d.window.to ? daysBetween(d.today, d.window.to) + 1 : null;

  return (
    <div className={cn("rounded-2xl bg-white", compact ? "" : "border border-gray-100 p-4 shadow-card")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-gray-500">
          <Target size={14} className="shrink-0" /> <span className="font-semibold text-gray-700">Progress Tracking</span> <span className="truncate">· {period}</span>
        </p>
        {!edit && !d.locked && (
          <button onClick={openEdit} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">
            <Pencil size={12} /> {g ? "แก้เป้า" : "ตั้งเป้า"}
          </button>
        )}
      </div>

      {g ? (
        <>
          <p className="mt-1 text-base font-semibold text-gray-900">
            ทำแล้ว <span className="tabular-nums">{d.total}</span> / <span className="tabular-nums">{g.target}</span> คลิป
            <span className="ml-1.5 text-sm font-medium text-brand-600">{pct}%</span>
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
          </div>
          {g.setByName && <p className="mt-1 text-[11px] text-gray-400">ตั้งเป้าโดย {g.setByName}</p>}
          <p className="mt-1.5 text-xs text-gray-500">
            {left === 0 ? "ถึงเป้าแล้ว เก่งมาก 🎉" : `อีก ${left} คลิปถึงเป้า`}
            {daysLeft != null && left > 0 && ` · เหลือ ${daysLeft} วัน`}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-600">
          เดือนนี้ทำแล้ว <b className="tabular-nums">{d.total}</b> คลิป — {staffId ? "ยังไม่ได้ตั้งเป้า" : "ตั้งเป้าเพื่อดูหลอดความคืบหน้า"}
        </p>
      )}
      <p className="mt-1 text-[11px] text-gray-400">
        นับจากคลิปที่ตัดแล้วผ่าน QC ({d.edit}) และคลิปที่ถ่ายแล้ว ({d.shoot}) · คลิปเดียวกันนับครั้งเดียว
      </p>

      {edit && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">ตั้งเป้าหมาย</p>
            <button onClick={() => setEdit(false)} className="rounded-full p-1 text-gray-400" aria-label="ปิด">
              <X size={16} />
            </button>
          </div>
          <label className="block text-xs text-gray-500">
            เป้ากี่คลิป
            <input type="number" inputMode="numeric" min={1} value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-base text-gray-900" />
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
            <button onClick={() => setMode("month")} className={cn("rounded-md py-1.5", mode === "month" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}>นับใหม่ทุกเดือน</button>
            <button onClick={() => setMode("from")} className={cn("rounded-md py-1.5", mode === "from" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}>เลือกวันเริ่มนับ</button>
          </div>
          {mode === "from" && (
            <label className="block text-xs text-gray-500">
              เริ่มนับตั้งแต่วันที่
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-base text-gray-900" />
            </label>
          )}
          <div className="flex items-center gap-2">
            <button
              disabled={busy || !(Number(target) >= 1) || (mode === "from" && !start)}
              onClick={() => save()}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก…" : "บันทึกเป้า"}
            </button>
            {g && (
              <button disabled={busy} onClick={() => window.confirm("ลบเป้าหมายนี้?") && save(true)} className="rounded-xl px-3 py-2.5 text-sm text-rose-500">
                ลบเป้า
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
