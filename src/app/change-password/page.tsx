"use client";

import { useState } from "react";
import Image from "next/image";
import { KeyRound } from "lucide-react";
import { APP_LOGO_SRC } from "@/config/branding";
import { PASSWORD_MIN, passwordError } from "@/lib/accountRules";

// Shown instead of the app while the account is still on the old 4-digit PIN (or on a
// temporary password the owner set): pick a real password, then carry on.
export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const err = next ? passwordError(next) : null;
  const mismatch = again && again !== next ? "รหัสผ่านใหม่ 2 ช่องไม่ตรงกัน" : null;
  const same = next && next === current ? "ใช้รหัสใหม่ที่ไม่ซ้ำกับรหัสเดิม" : null;
  const can = current && next && again && !err && !mismatch && !same && !busy;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!can) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/my/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      window.location.href = window.matchMedia("(max-width: 767px)").matches ? "/v2/clients" : "/dashboard";
      return;
    }
    setBusy(false);
    setError(data?.error ?? "เปลี่ยนไม่สำเร็จ ลองใหม่อีกครั้ง");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const field = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <Image src={APP_LOGO_SRC} alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
      <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600"><KeyRound size={20} /></div>
      <h1 className="mt-2 text-lg font-semibold text-gray-900">ตั้งรหัสผ่านใหม่ก่อนใช้งาน</h1>
      <p className="mt-1 max-w-xs text-center text-sm text-gray-500">
        บัญชีนี้ยังใช้ PIN 4 หลักเดิม (หรือรหัสชั่วคราวที่หัวหน้าตั้งให้) เพื่อความปลอดภัย ตั้งรหัสผ่านใหม่อย่างน้อย {PASSWORD_MIN} ตัวก่อน
      </p>
      <form onSubmit={save} className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <label className="text-xs font-medium text-gray-500">
          รหัสผ่านตอนนี้ (PIN เดิม หรือรหัสที่หัวหน้าให้)
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
        </label>
        <label className="text-xs font-medium text-gray-500">
          รหัสผ่านใหม่ (อย่างน้อย {PASSWORD_MIN} ตัว)
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} />
        </label>
        <label className="text-xs font-medium text-gray-500">
          พิมพ์รหัสผ่านใหม่อีกครั้ง
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={field} />
        </label>
        {(err || mismatch || same || error) && <p className="text-xs font-medium text-rose-600">{error || err || mismatch || same}</p>}
        <button type="submit" disabled={!can} className="mt-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
        </button>
        <button type="button" onClick={logout} className="py-2 text-center text-xs text-gray-400">ออกจากระบบ</button>
      </form>
    </div>
  );
}
