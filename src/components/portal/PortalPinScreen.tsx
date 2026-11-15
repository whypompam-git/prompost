"use client";

import { useState } from "react";
import { Delete, Lock } from "lucide-react";

// Client link: set a PIN on first open, then type it to get in (remembered ~30 days on this device).
export function PortalPinScreen({ clientKey, clientName, mode }: { clientKey: string; clientName: string; mode: "set" | "enter" }) {
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState<string | null>(null); // "set": the first entry, waiting for the repeat
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const step = mode === "enter" ? "enter" : first === null ? "new" : "repeat";
  const title = step === "enter" ? "ใส่ PIN เพื่อดูงาน" : step === "new" ? "ตั้ง PIN สำหรับลิงก์นี้" : "ใส่ PIN อีกครั้งเพื่อยืนยัน";
  const hint = step === "enter" ? "PIN ที่ตั้งไว้ตอนเปิดลิงก์ครั้งแรก" : "ตัวเลข 4–6 หลัก ใช้ทุกครั้งที่เปิดลิงก์นี้ (เครื่องนี้จะจำไว้ 30 วัน)";

  async function send(value: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/portal/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientKey, pin: value, action: mode }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) return window.location.reload();
    setBusy(false);
    setPin("");
    setFirst(null);
    setError(data?.error ?? "ไม่สำเร็จ ลองใหม่อีกครั้ง");
  }

  function confirm() {
    if (pin.length < 4 || busy) return;
    if (step === "new") {
      setFirst(pin);
      setPin("");
      return;
    }
    if (step === "repeat" && pin !== first) {
      setError("PIN 2 ครั้งไม่ตรงกัน ตั้งใหม่อีกครั้ง");
      setFirst(null);
      setPin("");
      return;
    }
    send(pin);
  }

  const press = (d: string) => {
    if (busy || pin.length >= 6) return;
    setError("");
    setPin((p) => p + d);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Lock size={22} /></div>
      <p className="mt-3 text-sm text-gray-500">{clientName}</p>
      <h1 className="mt-1 text-lg font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 max-w-xs text-center text-xs text-gray-400">{hint}</p>
      <div className="mt-6 flex h-4 items-center gap-3">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${pin.length > i ? "border-brand-500 bg-brand-500" : "border-gray-300"}`} />
        ))}
      </div>
      {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-800 shadow-card active:bg-gray-100">{d}</button>
        ))}
        <button onClick={() => setPin((p) => p.slice(0, -1))} className="flex h-14 w-14 items-center justify-center rounded-full text-gray-500" aria-label="ลบ"><Delete size={20} /></button>
        <button onClick={() => press("0")} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-800 shadow-card active:bg-gray-100">0</button>
        <button onClick={confirm} disabled={pin.length < 4 || busy} className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white disabled:opacity-40">ตกลง</button>
      </div>
      {mode === "enter" && <p className="mt-6 text-center text-[11px] text-gray-400">ลืม PIN? ติดต่อทีมงานให้รีเซ็ตให้</p>}
    </div>
  );
}
