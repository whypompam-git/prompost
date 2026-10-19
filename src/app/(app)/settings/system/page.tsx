"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, RefreshCw, Send, XCircle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { DIGEST_TOPICS } from "@/lib/alerts";
import { deleteLineChannel, listLineChannels, listTeams, saveLineChannel, type LineChannel } from "@/lib/supabase/queries";
import type { Team } from "@/lib/types";
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

const BLANK_CHANNEL: Omit<LineChannel, "id"> = {
  name: "",
  groupId: "",
  sendHour: 8,
  topics: DIGEST_TOPICS.map((t) => t.key),
  teamId: null,
  enabled: true,
};

// One row per LINE group: its own send hour, topics and (optionally) team.
function LineChannelsCard() {
  const [channels, setChannels] = useState<LineChannel[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editing, setEditing] = useState<(Omit<LineChannel, "id"> & { id?: string }) | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listLineChannels().then(setChannels).catch(() => setError("โหลดไม่ได้ — ต้องรัน migration 0033 ก่อน"));
    listTeams().then(setTeams).catch(() => {});
  }, []);

  async function save() {
    if (!editing) return;
    if (!editing.name.trim() || !/^[CRU][0-9a-f]{32}$/i.test(editing.groupId.trim())) {
      setMessage("ใส่ชื่อ และ Group ID ที่ขึ้นต้นด้วย C (พิมพ์ id ในกลุ่มเพื่อให้บอทตอบ)");
      return;
    }
    try {
      const saved = await saveLineChannel(editing);
      setChannels((prev) => (editing.id ? (prev ?? []).map((c) => (c.id === saved.id ? saved : c)) : [...(prev ?? []), saved]));
      setEditing(null);
      setMessage("");
    } catch {
      setMessage("บันทึกไม่สำเร็จ");
    }
  }

  async function remove(c: LineChannel) {
    if (!window.confirm(`ลบช่องทาง "${c.name}"?`)) return;
    await deleteLineChannel(c.id);
    setChannels((prev) => (prev ?? []).filter((x) => x.id !== c.id));
  }

  async function test(c: LineChannel) {
    if (!window.confirm(`ส่งข้อความทดสอบเข้ากลุ่ม "${c.name}" ตอนนี้เลย?`)) return;
    const res = await fetch("/api/line/send-digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send: true, channelId: c.id }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok && data.sent ? `ส่งเข้า "${c.name}" แล้ว` : (data.reason ?? data.error ?? "ส่งไม่สำเร็จ"));
  }

  const field = "rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">ช่องทางส่ง LINE (แยกกลุ่ม/เวลา/หัวข้อ)</p>
          <p className="text-xs text-gray-500">
            แต่ละช่องมีกลุ่ม LINE เวลาส่ง (เวลาไทย) หัวข้อ และทีมของตัวเอง ถ้ายังไม่มีช่องไหนเลย ระบบจะส่งสรุปรวมตอน 08:00 เข้ากลุ่มเดิม ·
            เวลาที่ไม่ใช่ 08:00 ต้องตั้ง CRON_SECRET ใน GitHub secrets (ดู ENVIRONMENTS.md)
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...BLANK_CHANNEL })}
          className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          + เพิ่มช่องทาง
        </button>
      </div>
      {error && <p className="text-xs text-amber-600">{error}</p>}
      {(channels ?? []).map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
          <span className="font-medium text-gray-800">{c.name}</span>
          <span className="text-xs text-gray-500">
            {String(c.sendHour).padStart(2, "0")}:00 · {c.topics.map((k) => DIGEST_TOPICS.find((t) => t.key === k)?.label ?? k).join(", ")}
            {teamName(c.teamId) && ` · ${teamName(c.teamId)}`}
            {!c.enabled && " · ปิดอยู่"}
          </span>
          <span className="ml-auto flex gap-1.5">
            <button onClick={() => test(c)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-white">ส่งทดสอบ</button>
            <button onClick={() => setEditing({ ...c })} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-white">แก้ไข</button>
            <button onClick={() => remove(c)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-white">ลบ</button>
          </span>
        </div>
      ))}
      {editing && (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/30 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="ชื่อช่อง เช่น กลุ่มการเงิน" className={field} />
            <input value={editing.groupId} onChange={(e) => setEditing({ ...editing, groupId: e.target.value })} placeholder="Group ID (C...)" className={field} />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              ส่งตอน
              <select value={editing.sendHour} onChange={(e) => setEditing({ ...editing, sendHour: Number(e.target.value) })} className={field}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              เฉพาะทีม
              <select value={editing.teamId ?? ""} onChange={(e) => setEditing({ ...editing, teamId: e.target.value || null })} className={field}>
                <option value="">ทุกทีม</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
            {DIGEST_TOPICS.map((t) => (
              <label key={t.key} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={editing.topics.includes(t.key)}
                  onChange={(e) =>
                    setEditing({ ...editing, topics: e.target.checked ? [...editing.topics, t.key] : editing.topics.filter((k) => k !== t.key) })
                  }
                />
                {t.label}
              </label>
            ))}
            <label className="ml-auto flex items-center gap-1.5">
              <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
              เปิดใช้งาน
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(null); setMessage(""); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white">ยกเลิก</button>
            <button onClick={save} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">บันทึก</button>
          </div>
        </div>
      )}
      {message && <p className="text-xs text-gray-600">{message}</p>}
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
        <LineChannelsCard />

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
