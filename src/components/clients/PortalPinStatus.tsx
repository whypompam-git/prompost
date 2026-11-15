"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

// Client info: whether the client set a PIN for their link, and (owner) reset it if they forgot.
export function PortalPinStatus({ clientId }: { clientId: string }) {
  const auth = useAuth();
  const [s, setS] = useState<{ set: boolean; setAt: string | null; locked: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/clients/portal-pin?clientId=${clientId}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setS(await res.json());
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function reset() {
    if (!window.confirm("รีเซ็ต PIN ลิงก์ลูกค้า? คนแรกที่เปิดลิงก์ต่อจากนี้จะตั้ง PIN ใหม่ — ส่งลิงก์ให้ลูกค้าเปิดทันทีหลังรีเซ็ต")) return;
    setBusy(true);
    const res = await fetch("/api/clients/portal-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return window.alert(data.error ?? "ไม่สำเร็จ");
    load();
  }

  if (!s) return null;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
      <KeyRound size={12} className="text-gray-400" />
      {s.set
        ? `ลูกค้าตั้ง PIN แล้ว (${new Date(s.setAt!).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })})${s.locked ? " · ตอนนี้ล็อกเพราะใส่ผิดหลายครั้ง" : ""}`
        : "ยังไม่ได้ตั้ง PIN — ลูกค้าจะตั้งเองตอนเปิดลิงก์ครั้งแรก"}
      {s.set && auth.role === "owner" && (
        <button disabled={busy} onClick={reset} className="font-medium text-brand-600 hover:underline disabled:opacity-50">
          รีเซ็ต PIN
        </button>
      )}
    </p>
  );
}
