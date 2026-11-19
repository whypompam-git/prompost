"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { LoadingView } from "@/components/ui/LoadingView";

type Order = {
  id: string; code: string; name: string; phone: string; address: string; note: string; total: number;
  status: string; createdAt: string; items: { name: string; price: number; qty: number }[];
};

// Combined print of several orders: a packing summary first, then one card per order
// (name, address, phone, items). Open from Sale → select orders → ปริ้น.
function PrintInner() {
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    fetch("/api/sale/orders")
      .then((r) => r.json())
      .then((d) => setOrders((d.orders as Order[]).filter((o) => ids.includes(o.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))))
      .catch(() => setOrders([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const need = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders ?? []) for (const i of o.items) m.set(i.name, (m.get(i.name) ?? 0) + i.qty);
    return [...m.entries()];
  }, [orders]);
  if (!orders) return <LoadingView />;

  return (
    <div className="min-h-screen bg-gray-100 text-black print:bg-white">
      {/* one label = one page of exactly 150 x 100 mm (landscape): set the printer's paper to the same size */}
      <style>{`
        @page { size: 150mm 100mm; margin: 0; }
        .label { width: 150mm; height: 100mm; padding: 5mm 6mm; box-sizing: border-box; overflow: hidden; background: #fff; display: flex; flex-direction: column; }
        @media print {
          html, body { width: 150mm; background: #fff !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .labels { padding: 0 !important; gap: 0 !important; }
          .label { break-after: page; page-break-after: always; box-shadow: none !important; border: 0 !important; }
          .label:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <p className="text-sm text-gray-600">{orders.length} ออเดอร์ · ใบปะหน้า 150×100 มม. (1 ออเดอร์ต่อ 1 ใบ)</p>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"><Printer size={15} /> ปริ้น</button>
      </div>
      <div className="labels flex flex-col items-center gap-4 p-4">
        {orders.length > 1 && (
          <section className="label border border-gray-300 shadow-sm">
            <h1 className="text-[15pt] font-bold leading-tight">สรุปของที่ต้องเตรียม · {orders.length} ออเดอร์</h1>
            <ul className="mt-2 grid flex-1 grid-cols-2 content-start gap-x-6 text-[11pt] leading-snug">
              {need.map(([n, q]) => <li key={n} className="flex justify-between border-b border-gray-300 py-0.5"><span className="truncate pr-2">{n}</span><b>× {q}</b></li>)}
            </ul>
          </section>
        )}
        {orders.map((o, idx) => {
          const qty = o.items.reduce((n, i) => n + i.qty, 0);
          return (
            <section key={o.id} className="label border border-gray-300 shadow-sm">
              <div className="flex items-baseline justify-between border-b-2 border-black pb-1">
                <p className="font-mono text-[14pt] font-bold leading-none">{o.code}</p>
                <p className="text-[9pt] text-gray-600">#{idx + 1}/{orders.length} · {new Date(o.createdAt).toLocaleDateString("th-TH")} · รวม {qty} ชิ้น</p>
              </div>
              <div className="mt-2 grid min-h-0 flex-1 grid-cols-[1.25fr_1fr] gap-x-5">
                <div className="min-w-0">
                  <p className="text-[9pt] text-gray-500">ผู้รับ</p>
                  <p className="text-[15pt] font-bold leading-tight">{o.name}</p>
                  <p className="mt-0.5 text-[14pt] font-semibold leading-tight">โทร {o.phone}</p>
                  <p className="mt-1.5 whitespace-pre-line text-[12pt] leading-snug">{o.address}</p>
                  {o.note && <p className="mt-1 text-[10pt] leading-tight">หมายเหตุ: {o.note}</p>}
                </div>
                <div className="min-w-0 border-l border-gray-400 pl-4">
                  <p className="text-[9pt] text-gray-500">รายการ</p>
                  <ul className="text-[12pt] leading-snug">
                    {o.items.map((i, k) => <li key={k} className="flex justify-between gap-2 border-b border-gray-300 py-0.5"><span className="min-w-0 break-words">{i.name}</span><b className="shrink-0">× {i.qty}</b></li>)}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function SalePrintPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <PrintInner />
    </Suspense>
  );
}
