"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/contracts/SignaturePad";

export function VoucherSignForm({ token, defaultName }: { token: string; defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [signature, setSignature] = useState("");
  const [sending, setSending] = useState(false);
  const can = name.trim().length >= 2 && signature !== "" && !sending;

  async function sign() {
    if (!can) return;
    setSending(true);
    try {
      const res = await fetch("/api/public/voucher-sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name: name.trim(), signature }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      router.refresh();
    } catch (err) {
      window.alert(`ลงนามไม่สำเร็จ: ${err instanceof Error ? err.message : "ลองใหม่อีกครั้ง"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto my-6 w-[210mm] max-w-full px-4">
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-800">ลงชื่อรับเงิน</p>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <SignaturePad onChange={setSignature} />
        <button onClick={sign} disabled={!can} className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
          {sending ? "กำลังบันทึก..." : "ยืนยันว่าได้รับเงินแล้ว"}
        </button>
        <p className="text-xs text-gray-400">ระบบบันทึกวันเวลาและอุปกรณ์ ณ ตอนลงนามไว้เป็นหลักฐาน</p>
      </div>
    </div>
  );
}
