"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { SCHEMA_EXPECTATIONS } from "@/lib/schemaExpectations";

type Result = { table: string; columns: string; migration: string; error?: string };

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
