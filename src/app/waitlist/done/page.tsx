"use client";

import { useEffect, useState } from "react";
import { Camera, Check, MessageCircle } from "lucide-react";
import { DONE_KEY, WAITLIST_LINE_URL } from "@/lib/waitlist";

type Receipt = { name: string; phone: string; position: number; again: boolean; at: string };

// Confirmation page after signing up: a receipt to screenshot, and the LINE to send it to.
export default function WaitlistDonePage() {
  const [r, setR] = useState<Receipt | null>(null);
  useEffect(() => {
    try {
      setR(JSON.parse(sessionStorage.getItem(DONE_KEY) ?? "null"));
    } catch {}
  }, []);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-5 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="PromPost" className="h-14 w-14 rounded-2xl shadow-sm" />
      <span className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={34} /></span>
      <h1 className="mt-4 text-2xl font-bold">{r?.again ? "คุณลงชื่อไว้แล้ว" : "ลงชื่อเรียบร้อย"}</h1>
      <p className="mt-1 text-sm text-gray-500">ขอบคุณที่สนใจ PromPost</p>

      {r && (
        <div className="mt-6 w-full rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50 p-5 text-left">
          <p className="text-center text-xs font-semibold tracking-wide text-brand-700">PROMPOST WAITLIST</p>
          <p className="mt-3 text-center text-sm text-gray-600">คิวลำดับที่</p>
          <p className="text-center text-5xl font-bold text-brand-700">{r.position || "-"}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">ชื่อ</dt><dd className="min-w-0 truncate font-medium text-gray-900">{r.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">เบอร์ลงท้าย</dt><dd className="font-medium text-gray-900">{r.phone}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">ลงชื่อเมื่อ</dt><dd className="font-medium text-gray-900">{new Date(r.at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
          </dl>
        </div>
      )}

      <div className="mt-6 w-full rounded-2xl bg-gray-50 p-5 text-left">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Camera size={16} className="text-brand-600" /> ขั้นตอนสุดท้าย เพื่อยืนยันสิทธิ์</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-600">
          <li>แคปหน้าจอนี้ไว้</li>
          <li>กดปุ่มด้านล่างเพื่อแอดไลน์ของเรา</li>
          <li>ส่งรูปที่แคปมาในแชต เราจะจดชื่อคุณไว้เป็นคิวแรกๆ</li>
        </ol>
      </div>

      <a href={WAITLIST_LINE_URL} target="_blank" rel="noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#06C755] py-4 text-base font-semibold text-white shadow-md active:scale-95">
        <MessageCircle size={20} /> แอดไลน์ แล้วส่งรูปที่แคปมา
      </a>
      <a href="/waitlist" className="mt-4 text-xs text-gray-400 underline">กลับหน้าแรก</a>
    </div>
  );
}
