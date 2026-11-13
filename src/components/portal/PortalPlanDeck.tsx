"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, PartyPopper, X } from "lucide-react";
import { ScriptText } from "@/components/ui/ScriptText";
import { cn } from "@/lib/utils";

export type PlanCard = { id: string; title: string; script: string | null; ref: string | null; category: string | null };
const CATEGORY: Record<string, string> = { mass: "คอนเทนต์ทั่วไป", royalty: "สร้างความผูกพัน", sell: "ขายของ" };

// The client's "แผนคอนเทนต์": one plan at a time — read the script, then ใช้ / แก้ / ไม่ใช้.
export function PortalPlanDeck({ clientKey, cards }: { clientKey: string; cards: PlanCard[] }) {
  const [list, setList] = useState(cards);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<"view" | "revise">("view");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
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
        <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-xl bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">
          {card.script?.trim() ? <ScriptText text={card.script} /> : <p className="text-gray-400">ยังไม่มีสคริปต์</p>}
        </div>
      </article>

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
    </div>
  );
}
