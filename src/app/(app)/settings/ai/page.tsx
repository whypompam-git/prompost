"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Save } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAuth } from "@/lib/auth/AuthContext";
import { listAiPlaybookVersions, listAiPlaybooks, saveAiPlaybook, type AiPlaybook, type AiPlaybookVersion } from "@/lib/supabase/queries";

const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// The writing rules the AI follows. Edited here by the owner; every save keeps
// the previous text as a version, so a bad change can always be undone.
export default function AiSettingsPage() {
  const auth = useAuth();
  const [playbooks, setPlaybooks] = useState<AiPlaybook[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [versions, setVersions] = useState<AiPlaybookVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pb = playbooks.find((p) => p.key === current);

  useEffect(() => {
    listAiPlaybooks()
      .then((list) => {
        setPlaybooks(list);
        if (list[0]) {
          setCurrent(list[0].key);
          setDraft(list[0].content);
        }
      })
      .catch(() => setError("โหลดไม่สำเร็จ — ต้องรัน migration 0042"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (current) listAiPlaybookVersions(current).then(setVersions).catch(() => setVersions([]));
  }, [current]);

  function pick(key: string) {
    if (draft !== (pb?.content ?? "") && !window.confirm("มีการแก้ที่ยังไม่บันทึก ทิ้งไหม?")) return;
    const next = playbooks.find((p) => p.key === key);
    setCurrent(key);
    setDraft(next?.content ?? "");
  }

  async function save() {
    if (!pb) return;
    setBusy(true);
    try {
      await saveAiPlaybook(pb, draft, auth.staffId);
      setPlaybooks((prev) => prev.map((p) => (p.key === pb.key ? { ...p, content: draft, updatedAt: new Date().toISOString() } : p)));
      setVersions(await listAiPlaybookVersions(pb.key));
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar title="ตั้งค่า" subtitle="กฎการเขียนของ AI" />
      <SettingsTabs />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {loading && <LoadingView />}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {!loading && !error && playbooks.length === 0 && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            ยังไม่มีกฎในเว็บ — นำเข้าจากโฟลเดอร์ด้วยคำสั่ง <code>node _tools/push-playbooks.mjs --apply</code> (ให้ผมรันให้ได้)
          </p>
        )}
        {pb && (
          <>
            <p className="text-xs text-gray-500">
              นี่คือกฎที่ AI ใช้เขียนสคริปต์/คิดไอเดีย แก้แล้วมีผลกับการสร้างครั้งถัดไปทันที (ไม่ต้อง deploy) ทุกครั้งที่บันทึก ข้อความเดิมถูกเก็บเป็นเวอร์ชันย้อนกลับได้
            </p>
            <div className="flex flex-wrap gap-1.5">
              {playbooks.map((p) => (
                <button
                  key={p.key}
                  onClick={() => pick(p.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${p.key === current ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {p.title}
                </button>
              ))}
            </div>
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{pb.title}</p>
                  <p className="text-[11px] text-gray-400">แก้ล่าสุด {fmt(pb.updatedAt)} · {draft.length.toLocaleString("th-TH")} ตัวอักษร</p>
                </div>
                <button onClick={save} disabled={busy || draft === pb.content} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
                  <Save size={14} /> {busy ? "กำลังบันทึก…" : "บันทึกกฎ"}
                </button>
              </div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={26} spellCheck={false} className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </Card>
            {versions.length > 0 && (
              <Card className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><History size={15} /> เวอร์ชันก่อนหน้า</p>
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <span>{fmt(v.savedAt)} · {v.content.length.toLocaleString("th-TH")} ตัวอักษร</span>
                    <button onClick={() => window.confirm("โหลดเวอร์ชันนี้ลงช่องแก้ไข? (ยังไม่บันทึกจนกว่าจะกด บันทึกกฎ)") && setDraft(v.content)} className="flex items-center gap-1 font-medium text-brand-600 hover:underline">
                      <RotateCcw size={12} /> โหลดมาแก้
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
