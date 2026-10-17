"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { SignaturePad } from "@/components/contracts/SignaturePad";

export function ContractSignForm({ shareToken, defaultName }: { shareToken: string; defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);

  const canSign = name.trim().length >= 2 && signature !== "" && agreed && !sending;

  async function handleSign() {
    if (!canSign) return;
    setSending(true);
    try {
      const res = await fetch("/api/public/contract-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: shareToken, name: name.trim(), signature, consent: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? String(res.status));
      }
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
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <PenLine size={16} />
          ลงนามสัญญา (ผู้ว่าจ้าง)
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อ-นามสกุลผู้ลงนาม</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </label>
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500">ลายเซ็น</span>
          <SignaturePad onChange={setSignature} />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span>ข้าพเจ้าได้อ่านและเข้าใจข้อความในสัญญาข้างต้นทั้งหมด และยินยอมลงลายมือชื่ออิเล็กทรอนิกส์ให้มีผลผูกพันตามกฎหมาย</span>
        </label>
        <button
          onClick={handleSign}
          disabled={!canSign}
          className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "กำลังบันทึก..." : "ยืนยันลงนาม"}
        </button>
        <p className="text-xs text-gray-400">
          ระบบจะบันทึกวันเวลา อุปกรณ์ และรหัสตรวจสอบของเอกสาร ณ ตอนลงนามไว้เป็นหลักฐาน หลังลงนามแล้วจะแก้ไขสัญญาไม่ได้
        </p>
      </div>
    </div>
  );
}
