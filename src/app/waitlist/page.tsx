"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, FileText, Film, Link2, Loader2, MessageCircle, Workflow } from "lucide-react";
import { CLIENT_COUNTS, DONE_KEY, INTERESTS, ROLES, SOURCES, TEAM_SIZES } from "@/lib/waitlist";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Workflow, title: "คลิปทุกชิ้นเดินครบทุกขั้น", text: "Plan → ถ่ายทำ → ตัดต่อ → QC → ลูกค้าอนุมัติ → โพส เห็นสถานะทุกคลิปในที่เดียว งานเลื่อนไปขั้นต่อไปเองเมื่อเสร็จ และแจ้งคนที่ต้องทำต่อทันที" },
  { icon: Film, title: "ตรวจดราฟแบบเลื่อนดูคลิป", text: "เลื่อนดูดราฟทีละคลิปเหมือน TikTok กดคอมเมนต์ตรงวินาทีที่อยากแก้ แล้วส่งกลับให้ Editor ได้ในปุ่มเดียว ไม่ต้องไล่อ่านแชต" },
  { icon: Link2, title: "ลิงก์ให้ลูกค้าตรวจและอนุมัติเอง", text: "ลูกค้าเปิดลิงก์ดูคลิป คอมเมนต์ตามวินาที กดอนุมัติหรือขอแก้ได้ทันที ไม่ต้องสมัครหรือโหลดแอป" },
  { icon: CalendarDays, title: "ปฏิทินและภาระงานทีม", text: "เห็นว่าวันไหนถ่าย วันไหนตัด วันไหนต้องส่ง ใครงานล้น ใครว่าง ลากย้ายวันได้ในปฏิทิน" },
  { icon: MessageCircle, title: "แจ้งเตือนทีมผ่าน LINE", text: "คลิปเข้าคิวตัด ตัดเสร็จรอตรวจ ลูกค้าสั่งแก้ ระบบบอกคนที่เกี่ยวข้องเอง ไม่ต้องตามงานทีละคน" },
  { icon: FileText, title: "เอกสารและบัญชีในระบบเดียว", text: "ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และรายรับรายจ่าย ผูกกับลูกค้าและงานที่ทำ" },
];
const STEPS = [
  ["1", "ลงชื่อรอด้านล่าง", "กรอกข้อมูลสั้นๆ ใช้เวลาไม่ถึงนาที"],
  ["2", "เราติดต่อกลับ", "ผู้ลงชื่อก่อนจะได้รับการติดต่อก่อน เพื่อคุยว่าระบบเหมาะกับทีมคุณอย่างไร"],
  ["3", "ได้ใช้งานเป็นกลุ่มแรก", "เปิดให้ทดลองใช้ก่อนใคร และมีส่วนร่วมบอกว่าอยากให้ระบบมีอะไรเพิ่ม"],
];

const input = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200";
const label = "mb-1.5 block text-sm font-medium text-gray-700";

function Chips({ options, value, onChange }: { options: readonly (readonly [string, string])[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([k, t]) => (
        <button type="button" key={k} onClick={() => onChange(value === k ? "" : k)} className={cn("rounded-full border px-3.5 py-2 text-sm", value === k ? "border-brand-500 bg-brand-500 font-medium text-white" : "border-gray-200 bg-white text-gray-700")}>
          {t}
        </button>
      ))}
    </div>
  );
}

export default function WaitlistPage() {
  const [f, setF] = useState({ name: "", phone: "", lineId: "", email: "", businessName: "", role: "", teamSize: "", clientCount: "", source: "", sourceClip: "", message: "", website: "" });
  const [interests, setInterests] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [utm, setUtm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    // ?src=tiktok-clip3 on the link tells us which clip brought them
    const q = new URLSearchParams(location.search).get("src") ?? "";
    setUtm(q.slice(0, 60));
    if (q && /^(tiktok|facebook|instagram|youtube)/i.test(q)) set("source", q.toLowerCase().split(/[-_]/)[0]);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/public/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, interests, consent, utm }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
      // the confirmation is its own page; the details live only in this browser tab (not in the URL)
      try {
        sessionStorage.setItem(DONE_KEY, JSON.stringify({ name: f.name.trim(), phone: f.phone.replace(/[^\d]/g, "").slice(-4), position: d.position ?? 0, again: Boolean(d.again), at: new Date().toISOString() }));
      } catch {}
      router.push("/waitlist/done");
    } catch (x) {
      setErr(x instanceof Error ? x.message : "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="top" className="mx-auto max-w-3xl px-5 pb-20">
      {/* hero */}
      <header className="flex flex-col items-center pt-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="PromPost" className="h-16 w-16 rounded-2xl shadow-sm" />
        <p className="mt-4 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">เปิดลงชื่อรอใช้งานก่อนใคร</p>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">ระบบจัดการงานคอนเทนต์วิดีโอ<br />ที่ทำให้ทีมไม่ต้องตามงานกันอีก</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">PromPost คือระบบที่ทีมทำคอนเทนต์และเอเจนซี่ใช้จริง ตั้งแต่วางแผนคลิป ถ่าย ตัดต่อ ตรวจดราฟ ให้ลูกค้าอนุมัติ ไปจนถึงโพส รวมอยู่ในที่เดียว</p>
        <a href="#form" className="mt-6 rounded-full bg-brand-500 px-7 py-3.5 text-base font-semibold text-white shadow-md active:scale-95">ลงชื่อรอใช้งาน</a>
      </header>

      {/* what it does */}
      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold">ทำอะไรได้บ้าง</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon size={20} /></span>
              <h3 className="mt-3 text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* for whom */}
      <section className="mt-14 rounded-3xl bg-gray-900 px-6 py-8 text-white">
        <h2 className="text-center text-xl font-bold">เหมาะกับใคร</h2>
        <ul className="mx-auto mt-5 grid max-w-xl gap-2.5 text-[15px]">
          {["เอเจนซี่ / ทีมที่รับทำคลิปให้หลายลูกค้า", "ทีมคอนเทนต์ในแบรนด์ที่มีคนถ่าย คนตัด คนตรวจ หลายคน", "ครีเอเตอร์ที่มีหลายช่องและมี Editor ช่วย", "ใครที่เบื่อการตามงานและส่งไฟล์ในแชตกลุ่ม"].map((t) => (
            <li key={t} className="flex items-start gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-brand-400" />{t}</li>
          ))}
        </ul>
      </section>

      {/* how it goes */}
      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold">ลงชื่อแล้วเกิดอะไรขึ้น</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border border-gray-100 p-5 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{n}</span>
              <p className="mt-3 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* form */}
      <section id="form" className="mt-14 scroll-mt-6">
        {(
          <form onSubmit={submit} className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <h2 className="text-2xl font-bold">ลงชื่อรอใช้งาน</h2>
              <p className="mt-1 text-sm text-gray-500">ช่องที่มี * ต้องกรอก</p>
            </div>
            <div><label className={label}>ชื่อ-นามสกุล หรือชื่อที่ให้เรียก *</label><input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={120} autoComplete="name" required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label}>เบอร์โทร *</label><input className={input} inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} autoComplete="tel" placeholder="0812345678" required /></div>
              <div><label className={label}>LINE ID</label><input className={input} value={f.lineId} onChange={(e) => set("lineId", e.target.value)} maxLength={80} placeholder="@yourline" /></div>
            </div>
            <div><label className={label}>อีเมล</label><input className={input} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} maxLength={160} autoComplete="email" /><p className="mt-1 text-xs text-gray-400">ใส่ LINE ID หรืออีเมลอย่างน้อย 1 อย่าง เพื่อให้เราติดต่อกลับได้</p></div>
            <div><label className={label}>ชื่อแบรนด์ / เอเจนซี่ / ช่อง</label><input className={input} value={f.businessName} onChange={(e) => set("businessName", e.target.value)} maxLength={120} /></div>
            <div><label className={label}>คุณทำงานด้านไหน *</label><Chips options={ROLES} value={f.role} onChange={(v) => set("role", v)} /></div>
            <div><label className={label}>ขนาดทีม</label><Chips options={TEAM_SIZES} value={f.teamSize} onChange={(v) => set("teamSize", v)} /></div>
            <div><label className={label}>จำนวนลูกค้า / ช่องที่ดูแลอยู่</label><Chips options={CLIENT_COUNTS} value={f.clientCount} onChange={(v) => set("clientCount", v)} /></div>
            <div>
              <label className={label}>สนใจฟีเจอร์ไหนเป็นพิเศษ (เลือกได้หลายข้อ)</label>
              <div className="grid gap-2">
                {INTERESTS.map(([k, t]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={interests.includes(k)} onChange={() => setInterests((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div><label className={label}>รู้จัก PromPost จากไหน</label><Chips options={SOURCES} value={f.source} onChange={(v) => set("source", v)} /></div>
            <div><label className={label}>คลิปไหน / ใครแนะนำ</label><input className={input} value={f.sourceClip} onChange={(e) => set("sourceClip", e.target.value)} maxLength={200} placeholder="เช่น คลิปที่พูดเรื่อง… หรือชื่อคนที่แนะนำ" /></div>
            <div><label className={label}>อยากให้ระบบช่วยแก้ปัญหาอะไร</label><textarea className={input} rows={3} value={f.message} onChange={(e) => set("message", e.target.value)} maxLength={600} /></div>
            {/* hidden field: people don't see it, bots fill it */}
            <input tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" value={f.website} onChange={(e) => set("website", e.target.value)} />
            <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              ยินยอมให้เก็บข้อมูลข้างต้นเพื่อติดต่อกลับเรื่องการใช้งาน PromPost เท่านั้น *
            </label>
            {err && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</p>}
            <button disabled={busy || !consent} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-50">
              {busy ? <><Loader2 size={18} className="animate-spin" /> กำลังส่ง…</> : "ลงชื่อรอใช้งาน"}
            </button>
          </form>
        )}
      </section>
      <footer className="mt-10 text-center text-xs text-gray-400">PromPost · พร้อมโพส</footer>
    </div>
  );
}
