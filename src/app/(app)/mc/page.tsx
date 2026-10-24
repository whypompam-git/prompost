"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Loader2, RefreshCw, Search, Trash2, UserRound } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAuth } from "@/lib/auth/AuthContext";
import { CLIENT_FIELDS, DEFAULT_CLIENT_SHOW } from "@/lib/mcSheet";
import { baht, mcPhoto } from "@/lib/mcDisplay";
import {
  createMcPack,
  deleteMcPack,
  getMcSettings,
  listMcPacks,
  listMcProfiles,
  saveMcSheetUrl,
  setMcPackEnabled,
} from "@/lib/supabase/queries";
import type { McPack, McProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const packUrl = (token: string) => `${window.location.origin}/mc-pack/${token}`;

export default function McPage() {
  const auth = useAuth();
  const [profiles, setProfiles] = useState<McProfile[]>([]);
  const [packs, setPacks] = useState<McPack[]>([]);
  const [settings, setSettings] = useState<{ sheetUrl: string; lastSyncedAt?: string; lastResult?: string }>({ sheetUrl: "" });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [packOpen, setPackOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  async function load() {
    const [p, k, s] = await Promise.all([listMcProfiles(), listMcPacks().catch(() => [] as McPack[]), getMcSettings().catch(() => ({ sheetUrl: "" }))]);
    setProfiles(p);
    setPacks(k);
    setSettings(s);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function sync() {
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch("/api/mc/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMessage(res.ok ? `อัปเดตแล้ว ${data.total} คน (ใหม่ ${data.added}, รูปที่คัดลอก ${data.photos})` : `ผิดพลาด: ${data.error ?? res.status}`);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter(
      (p) =>
        (showHidden || !p.hidden) &&
        (!q || [p.nickname, p.fullName, p.character, p.skills, p.experience].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [profiles, query, showHidden]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  }

  async function copyLink(p: McPack) {
    try {
      await navigator.clipboard.writeText(packUrl(p.shareToken));
      setMessage("คัดลอกลิงก์แล้ว");
    } catch {
      window.prompt("คัดลอกลิงก์นี้", packUrl(p.shareToken));
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="MC" subtitle="โปรไฟล์ MC สำหรับเสนอลูกค้า" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="MC" subtitle="โปรไฟล์ MC สำหรับเสนอลูกค้า" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อ / สไตล์ / ความสามารถ" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            แสดงที่ซ่อนไว้
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-gray-400 sm:inline">
              {settings.lastSyncedAt ? `ดึงล่าสุด ${new Date(settings.lastSyncedAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · อัตโนมัติทุกชั่วโมง` : "ยังไม่เคยดึงข้อมูล"}
            </span>
            <button onClick={sync} disabled={syncing} className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50">
              {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              อัปเดตจากชีต
            </button>
          </div>
        </div>
        {(message || settings.lastResult) && <p className="text-xs text-gray-500">{message || settings.lastResult}</p>}

        {auth.role === "owner" && (
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-xs text-gray-500 shadow-card">
            {editingUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="ลิงก์ Google Sheet (ต้องแชร์เป็นทุกคนที่มีลิงก์ดูได้)" className="min-w-[260px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
                <button onClick={async () => { await saveMcSheetUrl(urlDraft); setSettings((s) => ({ ...s, sheetUrl: urlDraft.trim() })); setEditingUrl(false); }} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white">บันทึก</button>
                <button onClick={() => setEditingUrl(false)} className="text-gray-400 hover:underline">ยกเลิก</button>
              </div>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                ชีตต้นทาง: <span className="max-w-[420px] truncate text-gray-700">{settings.sheetUrl || "ยังไม่ได้ตั้ง"}</span>
                <button onClick={() => { setUrlDraft(settings.sheetUrl); setEditingUrl(true); }} className="font-medium text-brand-600 hover:underline">เปลี่ยน</button>
              </span>
            )}
          </div>
        )}

        {selected.size > 0 && (
          <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm shadow">
            <span className="font-medium text-brand-700">เลือก {selected.size} คน</span>
            <button onClick={() => setPackOpen(true)} className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-600">สร้างชุดเสนอลูกค้า</button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-500 hover:underline">ล้างที่เลือก</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((p) => {
            const photo = mcPhoto(p);
            const on = selected.has(p.id);
            return (
              <div key={p.id} className={cn("overflow-hidden rounded-2xl border bg-white shadow-card", on ? "border-brand-500 ring-2 ring-brand-200" : "border-gray-100", p.hidden && "opacity-60")}>
                <div className="relative aspect-[3/4] bg-gray-100">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300"><UserRound size={48} /></div>
                  )}
                  <button onClick={() => toggle(p.id)} className={cn("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border", on ? "border-brand-500 bg-brand-500 text-white" : "border-white/80 bg-white/80")} aria-label="เลือก">
                    {on && <Check size={14} />}
                  </button>
                  {p.hidden && <span className="absolute right-2 top-2 rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-white">ซ่อน</span>}
                </div>
                <Link href={`/mc/${p.id}`} className="block p-3 hover:bg-gray-50">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.nickname}</p>
                  <p className="truncate text-xs text-gray-500">{[p.age && `${p.age} ปี`, p.height && `${p.height} ซม.`].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="mt-1 text-xs font-medium text-brand-700">{p.rateOffer ? `เสนอ ${baht(p.rateOffer)}` : <span className="font-normal text-amber-600">ยังไม่ใส่ราคาเสนอ</span>}</p>
                </Link>
              </div>
            );
          })}
        </div>
        {shown.length === 0 && <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">ไม่มี MC — กด "อัปเดตจากชีต" เพื่อดึงข้อมูล</p>}

        {packs.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">ชุดเสนอลูกค้าที่สร้างไว้</h2>
            <div className="space-y-2">
              {packs.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm shadow-card">
                  <span className="font-medium text-gray-800">{k.title}</span>
                  <span className="text-xs text-gray-400">{k.mcIds.length} คน</span>
                  {!k.enabled && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">ปิดลิงก์แล้ว</span>}
                  <span className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => copyLink(k)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"><Copy size={12} /> คัดลอกลิงก์</button>
                    <a href={packUrl(k.shareToken)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"><ExternalLink size={12} /> เปิดดู</a>
                    <button onClick={async () => { await setMcPackEnabled(k.id, !k.enabled); setPacks((p) => p.map((x) => (x.id === k.id ? { ...x, enabled: !k.enabled } : x))); }} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">{k.enabled ? "ปิดลิงก์" : "เปิดลิงก์"}</button>
                    <button onClick={async () => { if (!window.confirm(`ลบชุด "${k.title}"? ลิงก์ที่ส่งลูกค้าไปแล้วจะเปิดไม่ได้`)) return; await deleteMcPack(k.id); setPacks((p) => p.filter((x) => x.id !== k.id)); }} className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" aria-label="ลบ"><Trash2 size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {packOpen && (
        <PackModal
          count={selected.size}
          onClose={() => setPackOpen(false)}
          onCreate={async (title, show) => {
            const pack = await createMcPack({ title, mcIds: profiles.filter((p) => selected.has(p.id)).map((p) => p.id), show });
            setPacks((prev) => [pack, ...prev]);
            setSelected(new Set());
            setPackOpen(false);
            await copyLink(pack);
            setMessage(`สร้างชุด "${title}" แล้ว — คัดลอกลิงก์ให้แล้ว`);
          }}
        />
      )}
    </>
  );
}

function PackModal({ count, onClose, onCreate }: { count: number; onClose: () => void; onCreate: (title: string, show: Record<string, boolean>) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [show, setShow] = useState<Record<string, boolean>>({ ...DEFAULT_CLIENT_SHOW });
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-base font-semibold text-gray-900">สร้างชุดเสนอลูกค้า ({count} คน)</h3>
        <p className="mb-3 text-xs text-gray-400">ลูกค้าเห็นเฉพาะชื่อเล่น — ชื่อจริง เบอร์โทร และ Line ID ไม่แสดงเด็ดขาด</p>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อชุด เช่น MC งานเปิดตัว – ร้าน OYOKO" className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        <p className="mb-1.5 text-xs font-medium text-gray-500">ข้อมูลที่ลูกค้าเห็น</p>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          {CLIENT_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={show[f.key] ?? false} onChange={(e) => setShow((s) => ({ ...s, [f.key]: e.target.checked }))} />
              {f.label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">ยกเลิก</button>
          <button disabled={!title.trim() || busy} onClick={async () => { setBusy(true); try { await onCreate(title.trim(), show); } catch { window.alert("สร้างไม่สำเร็จ ลองใหม่อีกครั้ง"); setBusy(false); } }} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">สร้างและคัดลอกลิงก์</button>
        </div>
      </div>
    </div>
  );
}
