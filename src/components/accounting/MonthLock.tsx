"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Lock = { month: string; lockedAt: string; open: boolean; openUntil: string | null };
type State = { hasCode: boolean; isOwner: boolean; locks: Lock[] };
type Ask = null | { kind: "unlock" | "set-code"; month?: string };

const th = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("th-TH", { month: "long", year: "numeric" });

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/accounting/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "ไม่สำเร็จ");
  return d;
}

// Lock a cleared month: its transactions can't be added, changed or deleted until someone enters
// the lock code (which opens the month for 20 minutes). The database enforces it.
export function MonthLock({ month, onChanged }: { month: string | null; onChanged?: () => void }) {
  const [st, setSt] = useState<State | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [code, setCode] = useState("");
  const [oldCode, setOldCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/accounting/lock", { cache: "no-store" });
      if (r.ok) setSt(await r.json());
    } catch {}
  }, []);
  useEffect(() => void load(), [load]);

  const mine = st?.locks.find((l) => l.month === month);
  async function run(body: Record<string, unknown>, done?: () => void) {
    setBusy(true);
    setErr("");
    try {
      await call(body);
      await load();
      done?.();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    setAsk(null);
    setCode("");
    setOldCode("");
    setErr("");
  };
  if (!st) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {month ? (
        mine ? (
          mine.open ? (
            <>
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-700"><LockOpen size={15} /> {th(month)} เปิดแก้ไขชั่วคราวถึง {new Date(mine.openUntil!).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
              <button onClick={() => run({ action: "relock", month })} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-2 font-medium">ล็อกกลับทันที</button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 font-medium text-white"><Lock size={15} /> {th(month)} ล็อกแล้ว</span>
              <button onClick={() => setAsk({ kind: "unlock", month })} className="rounded-lg border border-gray-300 px-3 py-2 font-medium">ปลดล็อกเพื่อแก้ไข (ใส่รหัส)</button>
            </>
          )
        ) : (
          <button onClick={() => (st.hasCode ? window.confirm(`ล็อก ${th(month)}? จะเพิ่ม/แก้/ลบรายการของเดือนนี้ไม่ได้ จนกว่าจะใส่รหัสปลดล็อก`) && run({ action: "lock", month }) : setAsk({ kind: "set-code" }))} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50">
            <Lock size={15} /> ล็อก {th(month)}
          </button>
        )
      ) : (
        <span className="text-xs text-gray-400">เลือกช่วงเป็นเดือนเดียว เพื่อล็อก/ปลดล็อกเดือนนั้น</span>
      )}
      {st.isOwner && (
        <button onClick={() => setAsk({ kind: "set-code" })} className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-gray-500 hover:bg-gray-50"><KeyRound size={13} /> {st.hasCode ? "เปลี่ยนรหัสล็อก" : "ตั้งรหัสล็อก"}</button>
      )}
      {st.locks.length > 0 && <span className="text-xs text-gray-400">เดือนที่ล็อก: {st.locks.map((l) => l.month).join(", ")}</span>}

      {ask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
          <form
            className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (ask.kind === "unlock") run({ action: "unlock", month: ask.month, code }, close);
              else run({ action: "set-code", code, oldCode: st.hasCode ? oldCode : undefined }, close);
            }}
          >
            <p className="text-base font-semibold text-gray-900">{ask.kind === "unlock" ? `ปลดล็อก ${th(ask.month!)}` : st.hasCode ? "เปลี่ยนรหัสล็อก" : "ตั้งรหัสล็อกบัญชี"}</p>
            <p className="text-xs text-gray-500">{ask.kind === "unlock" ? "ใส่รหัสล็อก เดือนนี้จะเปิดให้แก้ได้ 20 นาที แล้วล็อกกลับเอง" : "รหัสนี้ใช้ปลดล็อกทุกเดือน (ยาว 4 ตัวอักษรขึ้นไป) เก็บเป็นความลับ และอย่าลืมรหัส"}</p>
            {ask.kind === "set-code" && st.hasCode && <input type="password" autoComplete="off" value={oldCode} onChange={(e) => setOldCode(e.target.value)} placeholder="รหัสเดิม" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />}
            <input type="password" autoComplete="off" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder={ask.kind === "unlock" ? "รหัสล็อก" : "รหัสล็อกใหม่"} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            {err && <p className="text-xs text-rose-600">{err}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={close} className="rounded-lg border border-gray-200 py-2 text-sm font-medium">ยกเลิก</button>
              <button disabled={busy || code.length < (ask.kind === "unlock" ? 1 : 4)} className={cn("rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white", busy && "opacity-60")}>{busy ? "กำลังทำ…" : "ยืนยัน"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
