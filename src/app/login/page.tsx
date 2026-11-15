"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password || submitting) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    if (res?.ok) {
      // phones land on the new clients grid, computers on the dashboard
      router.push(window.matchMedia("(max-width: 767px)").matches ? "/v2/clients" : "/dashboard");
      router.refresh();
      return;
    }
    const data = await res?.json().catch(() => ({}));
    setError(data?.error ?? "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
    setPassword("");
    setSubmitting(false);
  }

  const field = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image src={APP_LOGO_SRC} alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
        <h1 className="text-lg font-semibold text-gray-900">{APP_NAME}</h1>
      </div>

      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
        <label className="text-xs font-medium text-gray-500">
          ชื่อผู้ใช้
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={`mt-1 ${field}`}
          />
        </label>
        <label className="text-xs font-medium text-gray-500">
          รหัสผ่าน
          <div className="relative mt-1">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`${field} pr-12`}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <button type="submit" disabled={submitting || !username.trim() || !password} className="mt-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
        <p className="mt-2 text-center text-[11px] text-gray-400">พนักงานเดิม: รหัสผ่านคือ PIN 4 หลักเดิม ลืมชื่อผู้ใช้ให้ถามหัวหน้า</p>
      </form>
    </div>
  );
}
