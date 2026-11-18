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
    <div className="bg-white text-black">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } .order-card { break-inside: avoid; } @page { size: A4; margin: 12mm; } }`}</style>
      <div className="no-print sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3">
        <p className="text-sm text-gray-600">{orders.length} ออเดอร์</p>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"><Printer size={15} /> ปริ้น</button>
      </div>
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <section className="order-card rounded-lg border-2 border-black p-4">
          <h1 className="text-lg font-bold">สรุปของที่ต้องเตรียม ({orders.length} ออเดอร์)</h1>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 text-base">
            {need.map(([n, q]) => <li key={n} className="flex justify-between border-b border-gray-300 py-1"><span>{n}</span><b>× {q}</b></li>)}
          </ul>
        </section>
        {orders.map((o, idx) => (
          <section key={o.id} className="order-card rounded-lg border border-gray-400 p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-lg font-bold">{o.code}</p>
              <p className="text-xs text-gray-500">#{idx + 1} · {new Date(o.createdAt).toLocaleDateString("th-TH")}</p>
            </div>
            <p className="mt-2 text-base font-semibold">{o.name}</p>
            <p className="text-base">โทร {o.phone}</p>
            <p className="whitespace-pre-line text-base">{o.address}</p>
            {o.note && <p className="mt-1 text-sm">หมายเหตุ: {o.note}</p>}
            <table className="mt-3 w-full text-sm">
              <tbody>
                {o.items.map((i, k) => <tr key={k} className="border-t border-gray-300"><td className="py-1">{i.name}</td><td className="py-1 text-right font-semibold">× {i.qty}</td></tr>)}
              </tbody>
            </table>
          </section>
        ))}
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
