"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Maximize2, Minus, PartyPopper, Plus, X } from "lucide-react";
import { ScriptText } from "@/components/ui/ScriptText";
import { cn } from "@/lib/utils";

export type PlanCard = { id: string; title: string; script: string | null; ref: string | null; category: string | null };
const NOTE = "สคริปต์นี้เป็นโครงร่าง เนื้อหาและคำพูดปรับเปลี่ยนได้ตามหน้างานตอนถ่ายจริง";
const CATEGORY: Record<string, string> = { mass: "คอนเทนต์ทั่วไป", royalty: "สร้างความผูกพัน", sell: "ขายของ" };

// The client's "แผนคอนเทนต์": one plan at a time — read the script, then ใช้ / แก้ / ไม่ใช้.
export function PortalPlanDeck({ clientKey, cards }: { clientKey: string; cards: PlanCard[] }) {
  const [list, setList] = useState(cards);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<"view" | "revise">("view");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [reading, setReading] = useState(false);
  const [size, setSize] = useState(22);
  const card = list[Math.min(i, list.length - 1)];

  async function act(action: "use" | "revise" | "reject") {
    if (!card) return;
    if (action === "reject" && !window.confirm("ยืนยัน: ไม่ใช้แผนนี้?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/portal/task-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientKey, taskId: card.id, action, brief: action === "revise" ? brief.trim() : undefined }) });
      if (!res.ok) return window.alert(res.status === 409 ? "สถานะเปลี่ยนไปแล้ว กรุณารีเฟรชหน้านี้" : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
      if (action === "revise") {
        // stays a plan until the team sends the new version
        setMode("view");
        setBrief("");
        window.alert("ส่งสิ่งที่อยากให้แก้แล้ว ทีมงานจะส่งแผนที่แก้แล้วกลับมาให้เลือกอีกครั้ง");
        setI((x) => Math.min(x + 1, list.length - 1));
        return;
      }
      setList((prev) => prev.filter((c) => c.id !== card.id));
      setDone((d) => d + 1);
      if (list.length <= 1) setReading(false);
    } finally {
      setBusy(false);
    }
  }

  if (!card)
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center shadow-card">
        <PartyPopper size={36} className="text-violet-500" />
        <p className="text-base font-semibold text-gray-900">{done ? "เลือกครบแล้ว ขอบคุณค่ะ" : "ยังไม่มีแผนรอเลือก"}</p>
        <p className="text-sm text-gray-500">ทีมงานจะนัดถ่ายคลิปที่คุณเลือก “ใช้”</p>
      </div>
    );

  const idx = Math.min(i, list.length - 1);
  const actions = (
    <>
      {mode === "revise" ? (
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
            <p className="text-sm font-medium text-gray-700">อยากให้แก้ตรงไหน</p>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} autoFocus className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" placeholder="เช่น อยากให้พูดถึงโปรโมชั่นเดือนนี้ด้วย" />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode("view")} className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">ยกเลิก</button>
              <button disabled={busy || !brief.trim()} onClick={() => act("revise")} className="rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40">ส่งให้แก้</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button disabled={busy} onClick={() => act("reject")} className="flex flex-col items-center gap-1 rounded-2xl bg-white py-3 text-sm font-medium text-gray-600 shadow-card disabled:opacity-50">
              <X size={22} /> ไม่ใช้
            </button>
            <button disabled={busy} onClick={() => setMode("revise")} className="flex flex-col items-center gap-1 rounded-2xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-card disabled:opacity-50">
              ✏️ แก้
            </button>
            <button disabled={busy} onClick={() => act("use")} className={cn("flex flex-col items-center gap-1 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-card disabled:opacity-50")}>
              <Check size={22} /> ใช้
            </button>
          </div>
        )}
      </>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <button onClick={() => setI(Math.max(idx - 1, 0))} disabled={idx === 0} className="rounded-full p-1.5 disabled:opacity-30" aria-label="ก่อนหน้า"><ChevronLeft size={20} /></button>
        <span>แผนที่ {idx + 1} จาก {list.length}</span>
        <button onClick={() => setI(Math.min(idx + 1, list.length - 1))} disabled={idx >= list.length - 1} className="rounded-full p-1.5 disabled:opacity-30" aria-label="ถัดไป"><ChevronRight size={20} /></button>
      </div>
      <article className="rounded-2xl bg-white p-5 shadow-card">
        {card.category && <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">{CATEGORY[card.category] ?? card.category}</span>}
        <h2 className="mt-2 text-lg font-semibold text-gray-900">{card.title}</h2>
        {card.ref && (
          <a href={card.ref.startsWith("http") ? card.ref : `https://${card.ref}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline">
            ดูคลิปตัวอย่าง (Ref) →
          </a>
        )}
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{NOTE}</p>
        <button onClick={() => setReading(true)} className="relative mt-2 block max-h-[45vh] w-full overflow-hidden rounded-xl bg-gray-50 p-3 text-left text-sm leading-relaxed text-gray-800">
          {card.script?.trim() ? <ScriptText text={card.script} /> : <p className="text-gray-400">ยังไม่มีสคริปต์</p>}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent pb-2 pt-8 text-xs font-semibold text-brand-600">
            <Maximize2 size={13} /> แตะเพื่ออ่านเต็มจอ
          </span>
        </button>
      </article>

      {actions}
      {reading && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button onClick={() => setReading(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="ปิด"><X size={22} /></button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{card.title}</p>
              <p className="text-[11px] text-gray-400">แผนที่ {idx + 1} จาก {list.length}</p>
            </div>
            <button onClick={() => setSize((v) => Math.max(16, v - 2))} className="rounded-lg bg-gray-100 p-2" aria-label="ตัวเล็กลง"><Minus size={16} /></button>
            <button onClick={() => setSize((v) => Math.min(36, v + 2))} className="rounded-lg bg-gray-100 p-2" aria-label="ตัวใหญ่ขึ้น"><Plus size={16} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <p className="mx-auto mb-4 max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{NOTE}</p>
            <div className="mx-auto max-w-2xl text-gray-900" style={{ fontSize: size, lineHeight: 1.6 }}>
              {card.script?.trim() ? <ScriptText text={card.script} /> : <p className="text-gray-400">ยังไม่มีสคริปต์</p>}
            </div>
          </div>
          <div className="border-t border-gray-100 bg-gray-50 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto max-w-2xl">{actions}</div>
          </div>
        </div>
      )}
    </div>
  );
}
