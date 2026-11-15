"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";
import { PASSWORD_MIN, USERNAME_HINT, normalizeUsername, passwordError, usernameError } from "@/lib/accountRules";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const uErr = username ? usernameError(normalizeUsername(username)) : null;
  const pErr = password ? passwordError(password) : null;
  const can = name.trim() && username && password && !uErr && !pErr && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!can) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, password }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      window.location.href = "/welcome";
      return;
    }
    setError(data?.error ?? "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง");
    setBusy(false);
  }

  const field = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image src={APP_LOGO_SRC} alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
        <h1 className="text-lg font-semibold text-gray-900">สมัครใช้งาน {APP_NAME}</h1>
      </div>
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
        <label className="text-xs font-medium text-gray-500">
          ชื่อที่ให้ทีมเห็น
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น มิว" className={field} />
        </label>
        <label className="text-xs font-medium text-gray-500">
          ชื่อผู้ใช้ (ใช้เข้าระบบ)
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={field} />
          <span className={`mt-1 block text-[11px] ${uErr ? "text-rose-600" : "text-gray-400"}`}>{uErr ?? USERNAME_HINT}</span>
        </label>
        <label className="text-xs font-medium text-gray-500">
          รหัสผ่าน (อย่างน้อย {PASSWORD_MIN} ตัว)
          <div className="relative">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${field} pr-12`} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 mt-1 flex w-12 items-center justify-center text-gray-400" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {pErr && <span className="mt-1 block text-[11px] text-rose-600">{pErr}</span>}
        </label>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <button type="submit" disabled={!can} className="mt-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "กำลังสมัคร…" : "สมัคร"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">
          มีบัญชีแล้ว? <Link href="/login" className="font-medium text-brand-600">เข้าสู่ระบบ</Link>
        </p>
      </form>
    </div>
  );
}
