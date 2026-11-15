"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { PASSWORD_MIN, passwordError } from "@/lib/accountRules";

// Profile: change your own password (old one required). Folded until tapped.
export function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const err = next ? passwordError(next) : null;
  const mismatch = again && again !== next ? "รหัสผ่านใหม่ 2 ช่องไม่ตรงกัน" : null;
  const can = current && next && again && !err && !mismatch && !busy;

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/my/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) {
      setMsg({ ok: true, text: "เปลี่ยนรหัสผ่านแล้ว ครั้งหน้าใช้รหัสใหม่เข้าระบบ" });
      setCurrent("");
      setNext("");
      setAgain("");
      setOpen(false);
    } else setMsg({ ok: false, text: data?.error ?? "เปลี่ยนไม่สำเร็จ" });
  }

  const field = "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300";
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left text-sm font-medium text-gray-800">
        <KeyRound size={16} className="text-gray-400" /> เปลี่ยนรหัสผ่าน
        <span className="ml-auto text-xs text-brand-600">{open ? "ปิด" : "เปิด"}</span>
      </button>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
      {open && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-gray-500">
            รหัสผ่านเดิม (ถ้ายังไม่เคยเปลี่ยน คือ PIN 4 หลักเดิม)
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
          </label>
          <label className="block text-xs text-gray-500">
            รหัสผ่านใหม่ (อย่างน้อย {PASSWORD_MIN} ตัว)
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} />
          </label>
          <label className="block text-xs text-gray-500">
            พิมพ์รหัสผ่านใหม่อีกครั้ง
            <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={field} />
          </label>
          {(err || mismatch) && <p className="text-xs text-rose-600">{err ?? mismatch}</p>}
          <button disabled={!can} onClick={save} className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
          </button>
        </div>
      )}
    </div>
  );
}
