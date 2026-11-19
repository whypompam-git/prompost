"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, Search, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { CLIENT_COUNTS, INTERESTS, ROLES, SOURCES, STATUS_LABEL, TEAM_SIZES, labelOf } from "@/lib/waitlist";
import { cn } from "@/lib/utils";

type Signup = {
  id: string; position: number; name: string; phone: string; lineId: string; email: string; businessName: string; role: string; teamSize: string; clientCount: string;
  source: string; sourceClip: string; interests: string[]; message: string; utm: string; status: string; adminNote: string; createdAt: string;
};
const STYLE: Record<string, string> = { new: "bg-amber-50 text-amber-700", contacted: "bg-blue-50 text-blue-700", invited: "bg-violet-50 text-violet-700", joined: "bg-green-50 text-green-700", declined: "bg-gray-100 text-gray-400" };
const dt = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? `ผิดพลาด (${r.status})`);
  return d as T;
}

// The people who signed up on /waitlist from the promo clips. Owner only.
export default function LeadsPage() {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows((await api<{ signups: Signup[] }>("/api/waitlist")).signups);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: rows.length };
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (status === "all" || r.status === status) && (!t || [r.name, r.phone, r.lineId, r.email, r.businessName, r.sourceClip, r.message].join(" ").toLowerCase().includes(t))).reverse();
  }, [rows, q, status]);

  async function patch(id: string, body: Record<string, string>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...body } : r)));
    try {
      await api("/api/waitlist", { method: "PATCH", body: JSON.stringify({ id, ...body }) });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      load();
    }
  }
  async function remove(r: Signup) {
    if (!window.confirm(`ลบ ${r.name} ออกจากรายชื่อ? (ลบแล้วกู้คืนไม่ได้)`)) return;
    try {
      await api(`/api/waitlist?id=${r.id}`, { method: "DELETE" });
      setRows((p) => p.filter((x) => x.id !== r.id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }
  function csv() {
    const cell = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["ลำดับ", "วันที่", "ชื่อ", "เบอร์", "LINE", "อีเมล", "แบรนด์", "ประเภท", "ทีม", "จำนวนลูกค้า", "รู้จักจาก", "คลิป/คนแนะนำ", "ลิงก์ src", "สนใจ", "ข้อความ", "สถานะ", "โน้ต"];
    const lines = rows.map((r) => [r.position, dt(r.createdAt), r.name, r.phone, r.lineId, r.email, r.businessName, labelOf(ROLES, r.role), labelOf(TEAM_SIZES, r.teamSize), labelOf(CLIENT_COUNTS, r.clientCount), labelOf(SOURCES, r.source), r.sourceClip, r.utm, r.interests.map((i) => labelOf(INTERESTS, i)).join(" | "), r.message, STATUS_LABEL[r.status] ?? r.status, r.adminNote].map((x) => cell(String(x))).join(","));
    const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prompost-waitlist.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const link = typeof window === "undefined" ? "" : `${location.origin}/waitlist`;
  return (
    <>
      <Topbar title="Waitlist" subtitle={`${rows.length} คนรอใช้งาน`} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 text-sm shadow-card">
          <span className="text-gray-500">ลิงก์สำหรับใส่ในคลิป:</span>
          <code className="min-w-0 flex-1 truncate rounded bg-gray-50 px-2 py-1 text-xs">{link}</code>
          <button onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium">
            <Copy size={13} /> {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </button>
          <a href="/waitlist" target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium">เปิดดูหน้า</a>
          <p className="w-full text-xs text-gray-400">เพิ่ม <b>?src=tiktok-คลิป1</b> ต่อท้ายลิงก์ในแต่ละคลิป จะรู้ว่าใครมาจากคลิปไหน</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["all", "new", "contacted", "invited", "joined", "declined"] as const).map((k) => (
            <button key={k} onClick={() => setStatus(k)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", status === k ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600")}>
              {k === "all" ? "ทั้งหมด" : STATUS_LABEL[k]} ({counts[k] ?? 0})
            </button>
          ))}
          <button onClick={csv} disabled={!rows.length} className="ml-auto flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 disabled:opacity-40"><Download size={12} /> ส่งออก CSV</button>
        </div>
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ เบอร์ LINE อีเมล แบรนด์" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </label>

        {loading ? <LoadingView /> : err ? <p className="text-sm text-rose-600">{err}</p> : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">{rows.length ? "ไม่พบรายชื่อ" : "ยังไม่มีคนลงชื่อ"}</p>
        ) : (
          <div className="space-y-2">
            {shown.map((r) => {
              const isOpen = open === r.id;
              return (
                <div key={r.id} className="rounded-2xl border border-gray-100 bg-white shadow-card">
                  <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">{r.position}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{r.name}{r.businessName && <span className="font-normal text-gray-500"> · {r.businessName}</span>}</span>
                      <span className="block truncate text-xs text-gray-500">{labelOf(ROLES, r.role)} · {r.phone} · {dt(r.createdAt)}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium", STYLE[r.status])}>{STATUS_LABEL[r.status]}</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 border-t border-gray-100 px-4 py-4 text-sm">
                      <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                        {([["เบอร์โทร", r.phone], ["LINE ID", r.lineId], ["อีเมล", r.email], ["ทีม", labelOf(TEAM_SIZES, r.teamSize)], ["ลูกค้า/ช่องที่ดูแล", labelOf(CLIENT_COUNTS, r.clientCount)], ["รู้จักจาก", labelOf(SOURCES, r.source)], ["คลิป/คนแนะนำ", r.sourceClip], ["ลิงก์ src", r.utm]] as const).map(([k, v]) => (
                          <div key={k} className="flex gap-2"><dt className="w-28 shrink-0 text-gray-400">{k}</dt><dd className="min-w-0 break-words text-gray-800">{v || "-"}</dd></div>
                        ))}
                      </dl>
                      {r.interests.length > 0 && <p className="text-gray-700"><span className="text-gray-400">สนใจ: </span>{r.interests.map((i) => labelOf(INTERESTS, i)).join(" · ")}</p>}
                      {r.message && <p className="whitespace-pre-wrap rounded-xl bg-gray-50 px-3 py-2 text-gray-700">{r.message}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <select value={r.status} onChange={(e) => patch(r.id, { status: e.target.value })} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs">
                          {Object.entries(STATUS_LABEL).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                        </select>
                        <button onClick={() => remove(r)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50"><Trash2 size={13} /> ลบ</button>
                      </div>
                      <textarea defaultValue={r.adminNote} onBlur={(e) => e.target.value !== r.adminNote && patch(r.id, { adminNote: e.target.value })} rows={2} placeholder="โน้ตของเรา (เช่น คุยแล้ว นัดเดโม่วันไหน)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
