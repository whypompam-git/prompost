"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import { DigestCopyButton } from "@/components/layout/DigestCopyButton";
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
        <DigestCopyButton />
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

// what a group can receive: the daily summary sections + instant Editor updates
const LINE_TOPICS = [...DIGEST_TOPICS, { key: "editor", label: "อัปเดตงาน Editor (แจ้งทันที)" }] as const;
const topicLabel = (k: string) => LINE_TOPICS.find((t) => t.key === k)?.label ?? k;

const BLANK_CHANNEL: Omit<LineChannel, "id"> = {
  name: "",
  groupId: null,
  sendHour: 8,
  topics: ["tasks"],
  teamId: null,
  enabled: true,
};

// One row per LINE group: its workspace (this one), what it receives, team and digest hour.
// A new group is linked by typing a one-time code in it — no group IDs to copy.
function LineChannelsCard() {
  const [channels, setChannels] = useState<LineChannel[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editing, setEditing] = useState<(Omit<LineChannel, "id"> & { id?: string }) | null>(null);
  const [code, setCode] = useState<{ code: string; expiresAt: string; name: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reload = () => listLineChannels().then(setChannels).catch(() => setError("โหลดไม่ได้"));
  useEffect(() => {
    reload();
    listTeams().then(setTeams).catch(() => {});
  }, []);
  // while a code is showing, watch for the group to be linked
  useEffect(() => {
    if (!code) return;
    const t = setInterval(reload, 4000);
    return () => clearInterval(t);
  }, [code]);
  useEffect(() => {
    if (code && channels?.some((c) => c.name === code.name && c.groupId && !c.linkCode)) {
      setMessage(`เชื่อมกลุ่ม "${code.name}" แล้ว ✅`);
      setCode(null);
    }
  }, [channels, code]);

  async function requestCode(body: Record<string, unknown>, name: string) {
    const res = await fetch("/api/line/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error ?? "ขอรหัสไม่สำเร็จ");
    setCode({ code: data.code, expiresAt: data.expiresAt, name });
    setEditing(null);
    setMessage("");
    reload();
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) return setMessage("ตั้งชื่อช่องทาง");
    if (!editing.topics.length) return setMessage("เลือกอย่างน้อย 1 เรื่อง");
    if (!editing.id) return requestCode({ name: editing.name, topics: editing.topics, teamId: editing.teamId, sendHour: editing.sendHour }, editing.name.trim());
    try {
      const saved = await saveLineChannel(editing);
      setChannels((prev) => (prev ?? []).map((c) => (c.id === saved.id ? saved : c)));
      setEditing(null);
      setMessage("");
    } catch {
      setMessage("บันทึกไม่สำเร็จ");
    }
  }

  async function remove(c: LineChannel) {
    if (!window.confirm(`ลบช่องทาง "${c.name}"? (บอทจะไม่ส่งเข้ากลุ่มนี้อีก)`)) return;
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
  const time = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">ช่องทางส่ง LINE (แยกกลุ่มตามเรื่อง)</p>
          <p className="text-xs text-gray-500">
            แต่ละกลุ่มรับเฉพาะงานของ Workspace นี้ และเฉพาะเรื่องที่เลือก — สรุปประจำวันส่งตามเวลาที่ตั้ง · อัปเดตงาน Editor แจ้งทันที
          </p>
        </div>
        <button
          onClick={() => { setEditing({ ...BLANK_CHANNEL }); setCode(null); }}
          className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          + เชื่อมกลุ่มใหม่
        </button>
      </div>
      {error && <p className="text-xs text-amber-600">{error}</p>}

      {code && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-xs text-emerald-800">พิมพ์รหัสนี้ในกลุ่ม LINE "{code.name}"</p>
          <p className="my-2 select-all font-mono text-3xl font-bold tracking-wider text-emerald-900">{code.code}</p>
          <p className="text-[11px] text-emerald-700">
            1) เชิญบอท "พร้อมโพส" เข้ากลุ่ม 2) พิมพ์รหัสส่งในกลุ่ม 3) บอทตอบว่าเชื่อมแล้ว · รหัสหมดอายุ {time(code.expiresAt)}
          </p>
          <p className="mt-2 text-[11px] text-emerald-600">กำลังรอกลุ่มเชื่อมต่อ…</p>
        </div>
      )}

      {(channels ?? []).map((c) => {
        const waiting = !c.groupId;
        const expired = waiting && (!c.linkExpiresAt || Date.parse(c.linkExpiresAt) < Date.now());
        return (
          <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
            <span className="font-medium text-gray-800">{c.name}</span>
            <span className="text-xs text-gray-500">
              {c.topics.map(topicLabel).join(", ")}
              {c.topics.some((t) => t !== "editor") && ` · สรุป ${String(c.sendHour).padStart(2, "0")}:00`}
              {teamName(c.teamId) && ` · ${teamName(c.teamId)}`}
              {!c.enabled && !waiting && " · ปิดอยู่"}
            </span>
            {waiting && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                {expired ? "ยังไม่ได้เชื่อมกลุ่ม" : `รอพิมพ์รหัส ${c.linkCode}`}
              </span>
            )}
            <span className="ml-auto flex gap-1.5">
              {waiting ? (
                <button onClick={() => requestCode({ channelId: c.id }, c.name)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-brand-600 hover:bg-white">ขอรหัสใหม่</button>
              ) : (
                <button onClick={() => test(c)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-white">ส่งทดสอบ</button>
              )}
              <button onClick={() => setEditing({ ...c })} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-white">แก้ไข</button>
              <button onClick={() => remove(c)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-white">ลบ</button>
            </span>
          </div>
        );
      })}

      {editing && (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/30 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="ชื่อกลุ่ม เช่น กลุ่ม Editor" className={field} />
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
          <p className="text-xs font-medium text-gray-600">กลุ่มนี้จะได้รับ</p>
          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
            {LINE_TOPICS.map((t) => (
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
          </div>
          {editing.topics.some((t) => t !== "editor") && (
            <label className="flex items-center gap-2 text-xs text-gray-600">
              ส่งสรุปประจำวันตอน
              <select value={editing.sendHour} onChange={(e) => setEditing({ ...editing, sendHour: Number(e.target.value) })} className={field}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
          )}
          {editing.id && (
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
              เปิดใช้งาน
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(null); setMessage(""); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white">ยกเลิก</button>
            <button onClick={save} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
              {editing.id ? "บันทึก" : "สร้างรหัสเชื่อมกลุ่ม"}
            </button>
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
