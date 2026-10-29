"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Save, Sparkles, Trash2, XCircle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { ClientMultiFilter } from "@/components/dashboard/ClientMultiFilter";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { contextGaps } from "@/lib/aiContext";
import {
  checkFacts,
  checkKeywords,
  checkLength,
  checkVariety,
  nextTitleNumber,
  parseSellingLines,
  worst,
  type Level,
} from "@/lib/scriptChecks";
import { listClientContext, listClients, listTasksForClient } from "@/lib/supabase/queries";
import type { Client, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = { id: string; title: string; category: "" | "mass" | "royalty" | "sell"; script: string };
type Tab = "new" | "audit";

const LEVEL_STYLE: Record<Level, string> = { pass: "text-emerald-600", warn: "text-amber-600", fail: "text-rose-600" };
const LevelIcon = ({ level }: { level: Level }) =>
  level === "pass" ? <CheckCircle2 size={14} className="text-emerald-500" /> : level === "warn" ? <AlertTriangle size={14} className="text-amber-500" /> : <XCircle size={14} className="text-rose-500" />;

let seq = 0;
const newId = () => `d${++seq}`;

// Splits pasted text into clips: markdown headings ("## 3.01 ชื่อ"), a JSON batch
// ({tasks:[{title,script,category}]}), or a single script.
function parseBatch(text: string): Draft[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const j = JSON.parse(t);
      const list = Array.isArray(j) ? j : j.tasks;
      if (Array.isArray(list)) {
        return list.map((x: Record<string, unknown>) => ({ id: newId(), title: String(x.title ?? ""), category: (["mass", "royalty", "sell"].includes(String(x.category)) ? x.category : "") as Draft["category"], script: String(x.script ?? "") }));
      }
    } catch {
      /* fall through to text */
    }
  }
  const parts = t.split(/^(?=#{1,3}\s)/m).filter((p) => p.trim());
  if (parts.length > 1 || /^#{1,3}\s/.test(t)) {
    return parts.map((p) => {
      const [head, ...rest] = p.split("\n");
      return { id: newId(), title: head.replace(/^#{1,3}\s*/, "").trim(), category: "" as const, script: rest.join("\n").trim() };
    });
  }
  return [{ id: newId(), title: "", category: "", script: t }];
}

export default function StudioPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [context, setContext] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>("new");
  const [paste, setPaste] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [queue, setQueue] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({}); // audit mode: task id → edited script
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [gen, setGen] = useState({ mode: "script" as "ideas" | "script", count: 3, category: "", instruction: "" });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    listClients().then(setClients).finally(() => setLoading(false));
  }, []);

  async function pickClient(id: string) {
    setClientId(id);
    setDrafts([]);
    setEdits({});
    setMessage("");
    if (!id) return;
    const [ctx, ts] = await Promise.all([listClientContext(id).catch(() => ({})), listTasksForClient(id)]);
    setContext(Object.fromEntries(Object.entries(ctx).map(([k, v]) => [k, (v as { content: string }).content])));
    setTasks(ts);
  }

  const client = clients.find((c) => c.id === clientId);
  const phrases = useMemo(() => parseSellingLines(context.selling_lines ?? ""), [context]);
  const contextText = useMemo(() => Object.values(context).join("\n"), [context]);
  const gaps = clientId ? contextGaps(context) : [];
  const withScript = useMemo(() => tasks.filter((t) => t.scriptText?.trim()), [tasks]);

  // the clips being checked: pasted drafts, or the client's existing clips
  const items = tab === "new" ? drafts.map((d) => ({ id: d.id, title: d.title || "(ไม่มีชื่อ)", script: d.script })) : withScript.map((t) => ({ id: t.id, title: t.title, script: edits[t.id] ?? t.scriptText ?? "" }));
  const others = tab === "new" ? withScript.map((t) => ({ id: t.id, title: t.title, script: t.scriptText ?? "" })) : [];
  const variety = useMemo(() => checkVariety(items, others), [items, others]);

  const report = (it: { id: string; script: string }) => {
    const len = checkLength(it.script);
    const kw = checkKeywords(it.script, phrases);
    const facts = checkFacts(it.script, contextText);
    const v = variety[it.id];
    return { len, kw, facts, v, level: worst([len.level, kw.level, v?.level ?? "pass", facts.level]) };
  };

  async function generate() {
    setGenerating(true);
    setMessage("");
    try {
      const res = await fetch("/api/studio/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, ...gen }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setDrafts((p) => [...p, ...data.clips.map((c: { title: string; category: string; script: string }) => ({ id: newId(), title: c.title, category: c.category as Draft["category"], script: c.script }))]);
      setMessage(`AI สร้าง ${data.clips.length} คลิป · ค่าใช้จ่ายรอบนี้ ≈ ${data.costThb} บาท · วันนี้รวม ${data.spentToday.toFixed(2)}/${data.cap} บาท — ตรวจแล้วค่อยลงระบบ`);
    } catch (e) {
      setMessage(`ผิดพลาด: ${e instanceof Error ? e.message : "ลองใหม่"}`);
    } finally {
      setGenerating(false);
    }
  }

  function numberTitles() {
    const q = queue.trim();
    if (!q) return window.alert("ใส่เลขคิวก่อน เช่น 3");
    const titles = tasks.map((t) => t.title);
    setDrafts((prev) =>
      prev.map((d) => {
        if (/^\d+\.\d{2}\b/.test(d.title.trim())) return d;
        const n = nextTitleNumber(titles, q);
        const title = `${n} ${d.title.trim()}`.trim();
        titles.push(title);
        return { ...d, title };
      }),
    );
  }

  async function save(body: object, okMsg: (r: Record<string, unknown>) => string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/studio/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, ...body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.duplicates ? `ชื่อซ้ำ: ${data.duplicates.join(", ")}` : (data.details?.join("; ") ?? data.error ?? String(res.status)));
      setMessage(okMsg(data));
      setTasks(await listTasksForClient(clientId));
      return data;
    } catch (e) {
      setMessage(`ผิดพลาด: ${e instanceof Error ? e.message : "ลองใหม่"}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveNew() {
    const bad = drafts.filter((d) => !d.title.trim() || !d.script.trim());
    if (bad.length) return window.alert("ทุกคลิปต้องมีชื่อและสคริปต์");
    const fails = drafts.filter((d) => report({ id: d.id, script: d.script }).level === "fail").length;
    const warn = fails ? `\n⚠️ มี ${fails} คลิปที่ตัวตรวจขึ้นแดง (ลงได้ แต่ควรแก้ก่อน)` : "";
    if (!window.confirm(`ลง ${drafts.length} คลิปของ "${client?.name}" เป็น Plan (รอลูกค้าเลือก)?\nวันถ่าย/วันส่งจะเป็นวันชั่วคราว (อีก 14 วัน) — ต้องแก้เองภายหลัง\nงานจะขึ้นในลิงก์ลูกค้าถ้าเปิดลิงก์อยู่${warn}`)) return;
    const r = await save({ create: drafts.map((d) => ({ title: d.title.trim(), category: d.category || null, script: d.script })) }, (d) => `ลงระบบแล้ว ${(d.created as unknown[]).length} คลิป (Plan · วันชั่วคราว ${d.tempDate})`);
    if (r) setDrafts([]);
  }

  async function saveEdits() {
    const changed = withScript.filter((t) => edits[t.id] !== undefined && edits[t.id] !== t.scriptText);
    if (!changed.length) return;
    if (!window.confirm(`บันทึกสคริปต์ที่แก้ ${changed.length} คลิป? (ถ้ามีคนแก้ในระบบไปแล้ว คลิปนั้นจะไม่ถูกทับ)`)) return;
    const r = await save({ update: changed.map((t) => ({ id: t.id, script: edits[t.id], expectScript: t.scriptText ?? null })) }, (d) => {
      const u = d.updated as { updated: boolean }[];
      return `บันทึกแล้ว ${u.filter((x) => x.updated).length}/${u.length} คลิป${u.some((x) => !x.updated) ? " (ที่เหลือมีคนแก้ในระบบไปแล้ว ไม่ทับ)" : ""}`;
    });
    if (r) setEdits({});
  }

  if (loading) return (<><Topbar title="AI สคริปต์" subtitle="" /><LoadingView /></>);

  const Checks = ({ it }: { it: { id: string; script: string } }) => {
    const r = report(it);
    const row = (level: Level, label: string, msg: string) => (
      <p className={cn("flex items-start gap-1.5 text-xs", LEVEL_STYLE[level])}>
        <span className="mt-0.5 shrink-0"><LevelIcon level={level} /></span>
        <span><b>{label}</b> {msg}</span>
      </p>
    );
    return (
      <div className="space-y-1 rounded-lg bg-gray-50 p-2.5">
        {row(r.len.level, "ความยาว", r.len.message)}
        {row(r.kw.level, "คีย์เวิร์ด", r.kw.message)}
        {row(r.v?.level ?? "pass", "ไม่วน", r.v?.message ?? "—")}
        {row(r.facts.level, "ตัวเลข", r.facts.message)}
      </div>
    );
  };

  return (
    <>
      <Topbar title="AI สคริปต์" subtitle="ตรวจสคริปต์ก่อนลงระบบ: ความยาว · คีย์เวิร์ดขาย · ไม่วน · ตัวเลขที่ไม่รู้ที่มา" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <ClientMultiFilter clients={clients} selected={clientId ? [clientId] : []} onChange={(ids) => pickClient(ids.find((i) => i !== clientId) ?? ids[0] ?? "")} />
          {client && (
            <a href={`/clients/${client.id}/context`} className="text-xs font-medium text-brand-600 hover:underline">
              แก้บริบท/คีย์เวิร์ดของลูกค้า →
            </a>
          )}
        </div>

        {!clientId && <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">เลือกลูกค้าก่อน — ตัวตรวจจะใช้คีย์เวิร์ดและข้อมูลของลูกค้านั้น</p>}

        {clientId && (
          <>
            {gaps.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">ช่องว่างใน context: {gaps.join(" · ")}</p>}
            <p className="text-xs text-gray-500">
              คีย์เวิร์ด/ประโยคขายที่ตั้งไว้: {phrases.length ? phrases.map((p) => `"${p}"`).join(" · ") : <span className="text-amber-600">ยังไม่ได้ตั้ง (ตั้งที่ บริบท AI → คีย์เวิร์ด & ประโยคขาย) — ตัวตรวจคีย์เวิร์ดจะไม่ทำงาน</span>}
            </p>

            <div className="flex gap-2">
              {([["new", "วางสคริปต์ใหม่"], ["audit", `ตรวจงานเดิมของลูกค้า (${withScript.length})`]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} className={cn("rounded-lg px-4 py-2 text-sm font-medium", tab === k ? "bg-brand-500 text-white" : "border border-gray-200 bg-white text-gray-600")}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "new" && (
              <>
                <Card className="space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Sparkles size={15} className="text-brand-500" /> ให้ AI สร้าง</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <select value={gen.mode} onChange={(e) => setGen({ ...gen, mode: e.target.value as "ideas" | "script", count: Math.min(gen.count, e.target.value === "script" ? 10 : 15) })} className="rounded-lg border border-gray-200 px-2 py-1.5">
                      <option value="script">สคริปต์เต็ม (Sonnet ≈ 1–2 บาท/คลิป)</option>
                      <option value="ideas">ไอเดียสั้น ๆ (Haiku ≈ ไม่ถึงบาท)</option>
                    </select>
                    <input type="number" min={1} max={gen.mode === "script" ? 10 : 15} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} className="w-16 rounded-lg border border-gray-200 px-2 py-1.5" />
                    <span className="text-gray-500">คลิป</span>
                    <select value={gen.category} onChange={(e) => setGen({ ...gen, category: e.target.value })} className="rounded-lg border border-gray-200 px-2 py-1.5">
                      <option value="">หมวด: ให้ AI เลือก</option>
                      <option value="mass">Mass</option>
                      <option value="royalty">Royalty</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>
                  <textarea value={gen.instruction} onChange={(e) => setGen({ ...gen, instruction: e.target.value })} rows={3} placeholder="สั่งเพิ่มเติม เช่น ธีมเดือนนี้ โปรโมชั่น เรื่องที่ลูกค้าอยากเน้น…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  <button onClick={generate} disabled={generating || gen.count < 1} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
                    <Sparkles size={14} /> {generating ? "กำลังสร้าง… (อาจใช้ 1–3 นาที)" : "สร้าง"}
                  </button>
                  <p className="text-xs text-gray-400">ข้อมูลบริบทของลูกค้ารายนี้ (ไม่รวมข้อมูลการเงิน/ภาษี) จะถูกส่งไปยัง Anthropic เพื่อสร้าง · ผลลัพธ์ยังไม่ลงระบบจนกว่าจะกดลงเอง</p>
                </Card>

                <Card className="space-y-2">
                  <p className="text-xs text-gray-500">หรือวางสคริปต์ได้หลายคลิปพร้อมกัน — แบ่งคลิปด้วยหัวข้อ <code>## ชื่อคลิป</code> หรือวาง JSON ของ batch (<code>{"{tasks:[{title,script}]}"}</code>) หรือวางสคริปต์เดียว</p>
                  <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={7} placeholder={"## 3.01 ชื่อคลิป\nA) Hook…\n🎬 ภาพ…\n🗣 บทพูด…"} className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => { setDrafts((p) => [...p, ...parseBatch(paste)]); setPaste(""); }} disabled={!paste.trim()} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
                      <Plus size={14} /> แยกเป็นคลิปและตรวจ
                    </button>
                    {drafts.length > 0 && (
                      <>
                        <input value={queue} onChange={(e) => setQueue(e.target.value)} placeholder="เลขคิว เช่น 3" className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                        <button onClick={numberTitles} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">ใส่เลข &lt;คิว&gt;.&lt;NN&gt; ให้ชื่อที่ยังไม่มีเลข</button>
                      </>
                    )}
                  </div>
                </Card>

                {drafts.map((d) => {
                  const level = report({ id: d.id, script: d.script }).level;
                  return (
                    <Card key={d.id} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <LevelIcon level={level} />
                        <input value={d.title} onChange={(e) => setDrafts((p) => p.map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x)))} placeholder="ชื่อคลิป เช่น 3.01 ..." className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium" />
                        <select value={d.category} onChange={(e) => setDrafts((p) => p.map((x) => (x.id === d.id ? { ...x, category: e.target.value as Draft["category"] } : x)))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
                          <option value="">หมวด —</option>
                          <option value="mass">Mass</option>
                          <option value="royalty">Royalty</option>
                          <option value="sell">Sell</option>
                        </select>
                        <button onClick={() => setDrafts((p) => p.filter((x) => x.id !== d.id))} className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" aria-label="เอาออก"><Trash2 size={14} /></button>
                      </div>
                      <textarea value={d.script} onChange={(e) => setDrafts((p) => p.map((x) => (x.id === d.id ? { ...x, script: e.target.value } : x)))} rows={9} className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-300" />
                      <Checks it={{ id: d.id, script: d.script }} />
                    </Card>
                  );
                })}
                {drafts.length > 0 && (
                  <div className="sticky bottom-3 flex justify-end">
                    <button onClick={saveNew} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-600 disabled:opacity-50">
                      <Save size={15} /> ลงระบบเป็น Plan ({drafts.length} คลิป)
                    </button>
                  </div>
                )}
              </>
            )}

            {tab === "audit" && (
              <>
                {withScript.length === 0 && <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">ลูกค้ารายนี้ยังไม่มีสคริปต์ในระบบ</p>}
                {withScript.map((t) => {
                  const script = edits[t.id] ?? t.scriptText ?? "";
                  const level = report({ id: t.id, script }).level;
                  return (
                    <Card key={t.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <LevelIcon level={level} />
                        <a href={`/tasks/${t.id}`} className="text-sm font-semibold text-gray-800 hover:text-brand-600">{t.title}</a>
                        <span className="text-xs text-gray-400">{t.type}</span>
                      </div>
                      <Checks it={{ id: t.id, script }} />
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-brand-600">แก้สคริปต์</summary>
                        <textarea value={script} onChange={(e) => setEdits((p) => ({ ...p, [t.id]: e.target.value }))} rows={10} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs" />
                      </details>
                    </Card>
                  );
                })}
                {Object.keys(edits).length > 0 && (
                  <div className="sticky bottom-3 flex justify-end">
                    <button onClick={saveEdits} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-600 disabled:opacity-50">
                      <Save size={15} /> บันทึกสคริปต์ที่แก้
                    </button>
                  </div>
                )}
              </>
            )}
            {message && <p className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-700">{message}</p>}
          </>
        )}
      </div>
    </>
  );
}
