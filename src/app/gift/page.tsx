"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, ChevronLeft, Minus, Plus, ShoppingBag, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { problemText, type CartProblem } from "@/lib/shop";

type Product = { id: string; name: string; description: string; price: number; stock: number; maxPerPerson: number; imageUrl: string | null };
type Shop = { title: string; intro: string; lineNote: string; isOpen: boolean; products: Product[] };
type Done = { code: string; name: string; phone: string; address: string; total: number; status: string; createdAt: string; items: { name: string; price: number; qty: number }[]; lineNote: string };

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const GOLD = "bg-gradient-to-r from-[#b8923a] via-[#f0d68a] to-[#b8923a] text-[#1a1405]";
const input = "w-full rounded-xl border border-[#d4af37]/25 bg-[#141414] px-4 py-3 text-sm text-[#f5f1e6] placeholder:text-[#f5f1e6]/30 focus:border-[#d4af37] focus:outline-none";
const CART_KEY = "gift-cart-v1";

export default function GiftPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<{ img: string; total: number } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [slip, setSlip] = useState<{ file: File; preview: string } | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadShop = useCallback(async () => {
    try {
      const r = await fetch("/api/public/shop", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setShop(await r.json());
      setLoadErr(false);
    } catch {
      setLoadErr(true);
    }
  }, []);

  useEffect(() => {
    loadShop();
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "{}");
      if (saved && typeof saved === "object") setCart(saved);
    } catch {}
    // an order that was just placed can be re-opened (reload the success page)
    const code = new URLSearchParams(window.location.search).get("order");
    if (code) {
      fetch(`/api/public/shop/order?code=${encodeURIComponent(code)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setDone(d);
            setStep(3);
          }
        })
        .catch(() => {});
    }
  }, [loadShop]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const products = useMemo(() => shop?.products ?? [], [shop]);
  const lines = products.filter((p) => (cart[p.id] ?? 0) > 0).map((p) => ({ ...p, qty: cart[p.id] }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  function setQty(p: Product, qty: number) {
    const cap = Math.max(0, Math.min(p.stock, p.maxPerPerson));
    const q = Math.max(0, Math.min(cap, qty));
    setCart((c) => {
      const next = { ...c };
      if (q === 0) delete next[p.id];
      else next[p.id] = q;
      return next;
    });
  }

  function applyProblems(problems: CartProblem[]) {
    setCart((c) => {
      const next = { ...c };
      for (const p of problems) {
        if (p.available > 0) next[p.id] = Math.min(next[p.id] ?? 0, p.available);
        else delete next[p.id];
      }
      return next;
    });
    setMsg(problems.map(problemText).join(" · "));
  }

  // between step 1 and 2: re-check stock right now, then show the QR for the exact total
  async function goPay() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/public/shop/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cart: lines.map((l) => ({ id: l.id, qty: l.qty })) }) });
      const d = await r.json();
      await loadShop();
      if (!r.ok) {
        setMsg(d.error ?? "เช็คสินค้าไม่สำเร็จ");
        return;
      }
      if (!d.ok) {
        applyProblems(d.problems ?? []);
        return;
      }
      setQr(d.qr ? { img: await QRCode.toDataURL(d.qr, { margin: 1, width: 440, color: { dark: "#000000", light: "#ffffff" } }), total: d.total } : { img: "", total: d.total });
      setStep(2);
      window.scrollTo?.(0, 0);
    } catch {
      setMsg("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  function pickSlip(file?: File) {
    if (!file) return;
    if (slip) URL.revokeObjectURL(slip.preview);
    setSlip({ file, preview: URL.createObjectURL(file) });
  }

  const formOk = form.name.trim() && form.address.trim() && /^0\d{8,9}$/.test(form.phone.replace(/\D/g, "")) && !!slip;

  async function submit() {
    if (!slip || !formOk) return;
    setBusy(true);
    setMsg(null);
    try {
      // slip first (straight to storage), then the order with the slip attached
      const ext = (slip.file.name.split(".").pop() ?? "jpg").toLowerCase();
      const s = await fetch("/api/public/shop/slip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ext }) });
      if (!s.ok) throw new Error((await s.json().catch(() => ({}))).error ?? "อัปโหลดสลิปไม่สำเร็จ");
      const { path, token } = await s.json();
      const up = await createClient().storage.from("shop-slips").uploadToSignedUrl(path, token, slip.file, { contentType: slip.file.type || undefined });
      if (up.error) throw new Error("อัปโหลดสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
      const r = await fetch("/api/public/shop/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: lines.map((l) => ({ id: l.id, qty: l.qty })), ...form, slip: path }),
      });
      const d = await r.json();
      if (!r.ok) {
        await loadShop();
        if (d.problems) applyProblems(d.problems);
        setMsg(d.error ?? "สั่งซื้อไม่สำเร็จ");
        if (d.problems || d.race) setStep(1);
        return;
      }
      const sum = await fetch(`/api/public/shop/order?code=${d.code}`).then((x) => x.json());
      setDone(sum);
      setCart({});
      setStep(3);
      window.history.replaceState(null, "", `/gift?order=${d.code}`);
      window.scrollTo?.(0, 0);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "สั่งซื้อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-full max-w-lg px-4 pb-32 pt-8">
      <header className="text-center">
        <p className="font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-[0.35em] text-[#d4af37]">{(shop?.title ?? "GIFT").toUpperCase()}</p>
        <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        {shop?.intro && step === 1 && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#f5f1e6]/70">{shop.intro}</p>}
      </header>

      <Steps step={step} />

      {msg && <p className="mb-4 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#f0d68a]">{msg}</p>}

      {step === 1 && (
        <section>
          {loadErr && <p className="py-10 text-center text-sm text-[#f5f1e6]/60">โหลดไม่สำเร็จ <button className="text-[#d4af37] underline" onClick={loadShop}>ลองใหม่</button></p>}
          {!shop && !loadErr && <p className="py-10 text-center text-sm text-[#f5f1e6]/50">กำลังโหลด…</p>}
          {shop && !shop.isOpen && <p className="rounded-xl border border-[#d4af37]/30 py-8 text-center text-sm text-[#f5f1e6]/70">ปิดรับออเดอร์ชั่วคราว</p>}
          {shop && shop.isOpen && products.length === 0 && <p className="py-10 text-center text-sm text-[#f5f1e6]/50">ยังไม่มีสินค้า</p>}
          <div className="space-y-4">
            {shop?.isOpen && products.map((p) => {
              const q = cart[p.id] ?? 0;
              const out = p.stock <= 0;
              const cap = Math.min(p.stock, p.maxPerPerson);
              return (
                <article key={p.id} className="overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-[#111]">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className={`aspect-[4/3] w-full object-cover ${out ? "opacity-40 grayscale" : ""}`} />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-medium">{p.name}</h2>
                      <p className="shrink-0 font-[family-name:var(--font-serif)] text-xl font-semibold text-[#d4af37]">{baht(p.price)}</p>
                    </div>
                    {p.description && <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#f5f1e6]/60">{p.description}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-[#f5f1e6]/50">{out ? "สินค้าหมด" : `เหลือ ${p.stock} ชิ้น · จำกัดคนละ ${p.maxPerPerson} ชิ้น`}</p>
                      {out ? (
                        <span className="rounded-full border border-[#f5f1e6]/20 px-3 py-1 text-xs text-[#f5f1e6]/40">หมด</span>
                      ) : q === 0 ? (
                        <button onClick={() => setQty(p, 1)} className={`rounded-full px-5 py-1.5 text-sm font-semibold ${GOLD}`}>เพิ่ม</button>
                      ) : (
                        <div className="flex items-center gap-3 rounded-full border border-[#d4af37]/50 px-1.5 py-1">
                          <button aria-label="ลด" onClick={() => setQty(p, q - 1)} className="flex h-7 w-7 items-center justify-center rounded-full text-[#d4af37] hover:bg-[#d4af37]/15"><Minus size={16} /></button>
                          <span className="w-5 text-center text-sm font-semibold tabular-nums">{q}</span>
                          <button aria-label="เพิ่ม" disabled={q >= cap} onClick={() => setQty(p, q + 1)} className="flex h-7 w-7 items-center justify-center rounded-full text-[#d4af37] hover:bg-[#d4af37]/15 disabled:opacity-30"><Plus size={16} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {step === 2 && qr && (
        <section className="space-y-5">
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-[#d4af37]"><ChevronLeft size={16} /> กลับไปแก้ตะกร้า</button>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#111] p-4">
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between py-1 text-sm"><span>{l.name} × {l.qty}</span><span className="tabular-nums">{baht(l.price * l.qty)}</span></div>
            ))}
            <div className="mt-2 flex justify-between border-t border-[#d4af37]/20 pt-3 font-semibold"><span>ยอดชำระ</span><span className="font-[family-name:var(--font-serif)] text-2xl text-[#d4af37]">{baht(qr.total)}</span></div>
          </div>

          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#111] p-4 text-center">
            <p className="mb-3 text-sm text-[#f5f1e6]/70">สแกนจ่ายผ่านพร้อมเพย์ แล้วแนบสลิปด้านล่าง</p>
            {qr.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr.img} alt="PromptPay QR" className="mx-auto w-56 rounded-xl bg-white p-2" />
            ) : (
              <p className="py-6 text-sm text-[#f0d68a]">ร้านยังไม่ได้ตั้งค่าพร้อมเพย์ ติดต่อร้านก่อนชำระ</p>
            )}
          </div>

          <div className="space-y-3">
            <input className={input} placeholder="ชื่อ-นามสกุล ผู้รับ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} inputMode="tel" placeholder="เบอร์โทร" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <textarea className={input} rows={3} placeholder="ที่อยู่จัดส่ง (บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className={input} placeholder="หมายเหตุ (ถ้ามี)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickSlip(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-[#d4af37]/50 py-5 text-sm text-[#d4af37]">
              {slip ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slip.preview} alt="สลิป" className="max-h-48 rounded-lg" />
              ) : (
                <Upload size={22} />
              )}
              {slip ? "เปลี่ยนสลิป" : "แนบสลิปการโอนเงิน"}
            </button>
          </div>
        </section>
      )}

      {step === 3 && done && <Receipt d={done} />}

      {step !== 3 && shop?.isOpen && count > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#d4af37]/25 bg-[#0a0a0a]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-4">
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-xs text-[#f5f1e6]/60"><ShoppingBag size={14} /> {count} ชิ้น</p>
              <p className="font-[family-name:var(--font-serif)] text-2xl font-semibold text-[#d4af37]">{baht(step === 2 && qr ? qr.total : total)}</p>
            </div>
            {step === 1 ? (
              <button disabled={busy} onClick={goPay} className={`rounded-full px-7 py-3 text-sm font-semibold disabled:opacity-50 ${GOLD}`}>{busy ? "กำลังเช็คสต็อก…" : "ไปชำระเงิน"}</button>
            ) : (
              <button disabled={busy || !formOk} onClick={submit} className={`rounded-full px-7 py-3 text-sm font-semibold disabled:opacity-40 ${GOLD}`}>{busy ? "กำลังส่ง…" : "ยืนยันการสั่งซื้อ"}</button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Steps({ step }: { step: 1 | 2 | 3 }) {
  const items = ["เลือกของ", "ชำระเงิน", "สำเร็จ"];
  return (
    <ol className="my-7 flex items-center justify-center gap-2 text-[11px]">
      {items.map((t, i) => {
        const n = i + 1;
        const on = n <= step;
        return (
          <li key={t} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${on ? "border-[#d4af37] bg-[#d4af37] text-black" : "border-[#f5f1e6]/25 text-[#f5f1e6]/40"}`}>{n < step ? <Check size={13} /> : n}</span>
            <span className={on ? "text-[#f0d68a]" : "text-[#f5f1e6]/40"}>{t}</span>
            {n < 3 && <span className="h-px w-5 bg-[#d4af37]/30" />}
          </li>
        );
      })}
    </ol>
  );
}

function Receipt({ d }: { d: Done }) {
  return (
    <section className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#d4af37] text-black"><Check size={30} /></div>
      <h2 className="font-[family-name:var(--font-serif)] text-2xl text-[#f0d68a]">ชำระเงินสำเร็จ</h2>
      <div className="rounded-2xl border border-[#d4af37]/40 bg-[#111] p-5 text-left">
        <p className="text-center text-[11px] uppercase tracking-widest text-[#f5f1e6]/50">รหัสออเดอร์</p>
        <p className="text-center font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-widest text-[#d4af37]">{d.code}</p>
        <div className="my-4 h-px bg-[#d4af37]/20" />
        {d.items.map((i, idx) => (
          <div key={idx} className="flex justify-between py-1 text-sm"><span>{i.name} × {i.qty}</span><span className="tabular-nums">{baht(i.price * i.qty)}</span></div>
        ))}
        <div className="mt-2 flex justify-between border-t border-[#d4af37]/20 pt-3 font-semibold"><span>รวม</span><span className="text-[#d4af37]">{baht(d.total)}</span></div>
        <div className="mt-4 space-y-0.5 text-sm text-[#f5f1e6]/80">
          <p>{d.name} · {d.phone}</p>
          <p className="whitespace-pre-line text-xs text-[#f5f1e6]/60">{d.address}</p>
        </div>
      </div>
      <p className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#f0d68a]">แคปหน้านี้ แล้วส่งแจ้งใน {d.lineNote} เพื่อยืนยันออเดอร์</p>
    </section>
  );
}
