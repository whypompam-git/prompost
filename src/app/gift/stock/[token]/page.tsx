"use client";

import { useCallback, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

type Item = { id: string; name: string; imageUrl: string | null; stock: number; active: boolean };

// Temporary helper page: change stock only. The secret is in the link.
export default function StockPage({ params }: { params: { token: string } }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const r = await fetch(`/api/public/shop/stock?token=${params.token}`, { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error ?? "เปิดไม่ได้");
    setItems(d.products);
  }, [params.token]);
  useEffect(() => {
    load();
  }, [load]);

  async function change(id: string, body: { delta?: number; set?: number }) {
    setBusy(id);
    try {
      const r = await fetch("/api/public/shop/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.token, id, ...body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "ไม่สำเร็จ");
      setItems((list) => list?.map((i) => (i.id === id ? { ...i, stock: d.stock } : i)) ?? null);
      setTyped((t) => ({ ...t, [id]: "" }));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "ไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  if (err) return <main className="mx-auto max-w-lg px-5 py-20 text-center text-lg text-[#f0d68a]">{err}</main>;
  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-8">
      <p className="text-center font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-[0.3em] text-[#d4af37]">STOCK</p>
      <p className="mb-6 mt-2 text-center text-sm text-[#f5f1e6]/60">ปรับจำนวนสินค้าคงเหลือ (ลิงก์ชั่วคราว)</p>
      {!items && <p className="py-10 text-center text-[#f5f1e6]/60">กำลังโหลด…</p>}
      <div className="space-y-3">
        {items?.map((p) => (
          <div key={p.id} className={`rounded-2xl border border-[#d4af37]/25 bg-[#111] p-3 ${p.active ? "" : "opacity-50"}`}>
            <div className="flex items-center gap-3">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium">{p.name}{!p.active && " (ซ่อนอยู่)"}</p>
                <p className={`text-base ${p.stock === 0 ? "text-red-400" : "text-[#f0d68a]"}`}>เหลือ <b className="text-2xl tabular-nums">{p.stock}</b> ชิ้น</p>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={busy === p.id || p.stock <= 0} onClick={() => change(p.id, { delta: -1 })} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/60 text-[#d4af37] disabled:opacity-30" aria-label="ลด 1"><Minus size={20} /></button>
                <button disabled={busy === p.id} onClick={() => change(p.id, { delta: 1 })} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d4af37] text-black disabled:opacity-40" aria-label="เพิ่ม 1"><Plus size={20} /></button>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input inputMode="numeric" placeholder="ตั้งจำนวนใหม่" value={typed[p.id] ?? ""} onChange={(e) => setTyped({ ...typed, [p.id]: e.target.value.replace(/\D/g, "") })} className="min-w-0 flex-1 rounded-xl border border-[#d4af37]/25 bg-[#141414] px-3 py-2.5 text-base text-[#f5f1e6] placeholder:text-[#f5f1e6]/30 focus:border-[#d4af37] focus:outline-none" />
              <button disabled={busy === p.id || !(typed[p.id] ?? "")} onClick={() => change(p.id, { set: Number(typed[p.id]) })} className="rounded-xl border border-[#d4af37]/60 px-4 text-base text-[#d4af37] disabled:opacity-30">บันทึก</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
