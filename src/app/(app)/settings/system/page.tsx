"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, RefreshCw, Send, XCircle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { SCHEMA_EXPECTATIONS } from "@/lib/schemaExpectations";

type Result = { table: string; columns: string; migration: string; error?: string };

function LineDigestCard() {
  const [preview, setPreview] = useState<string | null | undefined>(undefined);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function call(send: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/line/send-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      if (send) setMessage(data.sent ? "ส่งเข้า LINE แล้ว" : data.reason ?? "ไม่ได้ส่ง");
      else {
        setPreview(data.text);
        setConfigured(Boolean(data.configured));
      }
    } catch (err) {
      setMessage(`ผิดพลาด: ${err instanceof Error ? err.message : "ลองใหม่อีกครั้ง"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <MessageCircle size={18} className="mt-0.5 shrink-0 text-emerald-500" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">สรุปประจำวันเข้า LINE กลุ่มทีม</p>
          <p className="text-xs text-gray-500">
            ส่งอัตโนมัติทุกเช้า ~08:00 (ค้างชำระเกิน 7 วัน, งานครบกำหนด, คำขอลารออนุมัติ) — ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN, LINE_TO และ CRON_SECRET ใน Vercel (ดู ENVIRONMENTS.md)
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => call(false)} disabled={busy} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          ดูตัวอย่างสรุปวันนี้
        </button>
        <button onClick={() => window.confirm("ส่งสรุปวันนี้เข้ากลุ่ม LINE ตอนนี้เลย?") && call(true)} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
          <Send size={12} />
          ส่งเข้า LINE ตอนนี้
        </button>
        {configured !== null && (
          <span className={configured ? "text-xs text-emerald-600" : "text-xs text-amber-600"}>
            {configured ? "ตั้งค่า LINE แล้ว" : "ยังไม่ได้ตั้งค่า LINE"}
          </span>
        )}
        {message && <span className="text-xs text-gray-600">{message}</span>}
      </div>
      {preview !== undefined && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
          {preview ?? "วันนี้ไม่มีเรื่องที่ต้องแจ้ง"}
        </pre>
      )}
    </Card>
  );
}

export default function SystemPage() {
  const [results, setResults] = useState<Result[] | null>(null);
  const [checking, setChecking] = useState(false);

  async function runCheck() {
    setChecking(true);
    const db = createClient();
    const out = await Promise.all(
      SCHEMA_EXPECTATIONS.map(async (e): Promise<Result> => {
        const { error } = await db.from(e.table).select(e.columns).limit(1);
        return { ...e, error: error?.message };
      }),
    );
    setResults(out);
    setChecking(false);
  }

  useEffect(() => {
    runCheck();
  }, []);

  const missing = results?.filter((r) => r.error) ?? [];

  return (
    <>
      <Topbar title="ตั้งค่า" subtitle="ตรวจความพร้อมของฐานข้อมูล" />
      <SettingsTabs />
      <div className="flex-1 space-y-3 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {results === null
              ? "กำลังตรวจ..."
              : missing.length === 0
                ? "ฐานข้อมูลครบทุกอย่างที่ระบบต้องใช้"
                : `ขาด ${missing.length} รายการ — ต้องรัน SQL ตามไฟล์ migration ที่ระบุ`}
          </p>
          <button
            onClick={runCheck}
            disabled={checking}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
            ตรวจอีกครั้ง
          </button>
        </div>

        <LineDigestCard />

        {results?.map((r) => (
          <Card key={r.table} className="flex items-start gap-3 !p-3">
            {r.error ? (
              <XCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {r.table} <span className="font-normal text-gray-400">· migration {r.migration}</span>
              </p>
              <p className="truncate text-xs text-gray-500">{r.columns}</p>
              {r.error && <p className="mt-1 text-xs text-rose-600">{r.error}</p>}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
