"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientSubNav } from "@/components/clients/ClientSubNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { CONTEXT_KEYS, contextGaps, isTemplateOnly } from "@/lib/aiContext";
import { getClient, listClientContext, saveClientContext } from "@/lib/supabase/queries";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

const HINTS: Record<string, string> = {
  selling_lines:
    "ใส่ประโยคขาย/คีย์เวิร์ดสำคัญของลูกค้าบรรทัดละ 1 ข้อ — AI จะแทรกให้ในสคริปต์ทุกคลิป เช่น\n- \"เนื้อสดใหม่ทุกวัน\" (ต้องมีในท่อน Hook หรือ ③ และ CTA)\n- ชื่อร้าน + จุดขายหลัก: \"หมูกระทะพรีเมียม ราคาเดียว 259\"",
  brand_voice: "สรรพนาม / คำลงท้าย / โทนเสียง / คำที่ห้ามใช้ — สำคัญที่สุดต่อสไตล์สคริปต์",
  notes_log: "ข้อเปลี่ยนแปลง/คำขอล่าสุดจากลูกค้า (ใหม่สุดอยู่บน)",
};

export default function ClientContextPage() {
  const params = useParams<{ id: string }>();
  const auth = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getClient(params.id), listClientContext(params.id)])
      .then(([c, ctx]) => {
        setClient(c);
        const m = Object.fromEntries(Object.entries(ctx).map(([k, v]) => [k, v.content]));
        setSaved(m);
        setDrafts(m);
      })
      .catch(() => setError("โหลดไม่สำเร็จ — ต้องรัน migration 0042 และมีสิทธิ์ \"AI สคริปต์\""))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function save(key: string) {
    setBusy(key);
    try {
      await saveClientContext(params.id, key, drafts[key] ?? "", auth.staffId);
      setSaved((p) => ({ ...p, [key]: drafts[key] ?? "" }));
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy("");
    }
  }

  if (loading) return (<><Topbar back="/clients" title="บริบท AI" subtitle="" /><LoadingView /></>);
  if (!client) return (<><Topbar back="/clients" title="ไม่พบลูกค้า" subtitle="" /><div className="p-6 text-sm text-gray-500">{error || "ไม่พบลูกค้ารายนี้"}</div></>);

  const gaps = contextGaps(saved);
  return (
    <>
      <Topbar back="/clients" title={client.name} subtitle="บริบทสำหรับ AI สคริปต์" />
      <ClientSubNav clientId={client.id} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <p className="text-xs text-gray-500">
          ข้อมูลชุดนี้คือสิ่งที่ AI อ่านก่อนเขียนสคริปต์/คิดไอเดียให้ลูกค้ารายนี้ (แหล่งหลักอยู่ที่เว็บ — แก้ที่นี่ได้เลย) ห้ามใส่เลขภาษี ที่อยู่ หรือข้อมูลการเงินของลูกค้า
        </p>
        {gaps.length > 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>ช่องว่างที่ควรเติมก่อนสั่ง AI: {gaps.join(" · ")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check size={16} /> ข้อมูลหลักครบ พร้อมให้ AI ใช้
          </div>
        )}

        {CONTEXT_KEYS.map((k) => {
          const empty = isTemplateOnly(saved[k.key] ?? "");
          const dirty = (drafts[k.key] ?? "") !== (saved[k.key] ?? "");
          const isOpen = open[k.key] ?? (k.core && empty); // empty core sections open so they get filled
          return (
            <Card key={k.key} className="!p-0">
              <button onClick={() => setOpen((p) => ({ ...p, [k.key]: !isOpen }))} className="flex w-full items-center gap-2 px-4 py-3 text-left">
                {isOpen ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800">{k.label}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", empty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                  {empty ? "ว่าง" : `${(saved[k.key] ?? "").length.toLocaleString("th-TH")} ตัวอักษร`}
                </span>
                {dirty && <span className="text-[11px] text-rose-500">· ยังไม่ได้บันทึก</span>}
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-gray-100 p-4">
                  {HINTS[k.key] && <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">{HINTS[k.key]}</p>}
                  <textarea
                    value={drafts[k.key] ?? ""}
                    onChange={(e) => setDrafts((p) => ({ ...p, [k.key]: e.target.value }))}
                    rows={k.key === "content_history" || k.key === "notes_log" ? 18 : 10}
                    spellCheck={false}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <div className="flex justify-end">
                    <button onClick={() => save(k.key)} disabled={!dirty || busy === k.key} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
                      <Save size={14} /> {busy === k.key ? "กำลังบันทึก…" : "บันทึก"}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
