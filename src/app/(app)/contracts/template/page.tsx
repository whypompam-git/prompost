"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClauseEditor } from "@/components/contracts/ClauseEditor";
import { DEFAULT_CONTRACT_TEMPLATE, TEMPLATE_VARIABLES } from "@/lib/contractTemplate";
import { getContractTemplate, saveContractTemplate } from "@/lib/supabase/queries";
import type { ContractTemplate } from "@/lib/types";

const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

export default function ContractTemplatePage() {
  const [tpl, setTpl] = useState<ContractTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getContractTemplate()
      .then(setTpl)
      .catch((err) => {
        console.error(err);
        setTpl(DEFAULT_CONTRACT_TEMPLATE);
      });
  }, []);

  async function handleSave() {
    if (!tpl) return;
    setSaving(true);
    try {
      await saveContractTemplate(tpl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      window.alert(`บันทึกไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    } finally {
      setSaving(false);
    }
  }

  if (!tpl) {
    return (
      <>
        <Topbar back="/documents" title="แม่แบบสัญญา" subtitle="" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar back="/documents" title="แม่แบบสัญญา" subtitle="แก้ครั้งเดียว ใช้กับสัญญาใหม่ทุกฉบับ (สัญญาที่สร้างไปแล้วไม่เปลี่ยน)" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-gray-700">ตัวแปรที่ระบบเติมให้ตอนสร้างสัญญา</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <span key={v.key} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600" title={v.hint}>
                {`{{${v.key}}}`} <span className="text-gray-400">· {v.hint}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            ข้อความในรูปแบบ [ระบุ…] ระบบจะไม่เติมให้ แต่จะเตือนก่อนส่งสัญญาว่ายังกรอกไม่ครบ
          </p>
        </Card>

        <Card className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อสัญญา</span>
            <input value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ข้อความนำ (ก่อนรายชื่อคู่สัญญา)</span>
            <textarea value={tpl.intro} onChange={(e) => setTpl({ ...tpl, intro: e.target.value })} rows={2} className={field} />
          </label>
        </Card>

        <ClauseEditor clauses={tpl.clauses} onChange={(clauses) => setTpl({ ...tpl, clauses })} />

        <Card>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ข้อความปิดท้าย (ก่อนช่องลงนาม)</span>
            <textarea value={tpl.closing} onChange={(e) => setTpl({ ...tpl, closing: e.target.value })} rows={2} className={field} />
          </label>
        </Card>

        <div className="flex items-center justify-between">
          <button
            onClick={() => window.confirm("คืนค่าแม่แบบเป็นแบบตั้งต้น? ข้อความที่แก้ไว้จะหายไป (ยังไม่บันทึกจนกว่าจะกดบันทึก)") && setTpl(DEFAULT_CONTRACT_TEMPLATE)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw size={14} />
            คืนค่าแบบตั้งต้น
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
          >
            <Save size={15} />
            {saved ? "บันทึกแล้ว" : saving ? "กำลังบันทึก..." : "บันทึกแม่แบบ"}
          </button>
        </div>
      </div>
    </>
  );
}
