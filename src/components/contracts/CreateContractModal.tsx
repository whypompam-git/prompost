"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Client, ContractInstallment, Package } from "@/lib/types";

const todayIso = () => new Date().toISOString().slice(0, 10);
const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const baht = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

export type CreateContractValues = {
  clientId: string;
  signDate: string;
  startDate?: string;
  endDate?: string;
  packageName?: string;
  totalAmount: number;
  installments: ContractInstallment[];
};

type Row = { label: string; percent: number; due: string };

export function CreateContractModal({
  clients,
  packages,
  onClose,
  onSave,
}: {
  clients: Client[];
  packages: Package[];
  onClose: () => void;
  onSave: (values: CreateContractValues) => Promise<void>;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [packageId, setPackageId] = useState("");
  const [packageName, setPackageName] = useState("");
  const [total, setTotal] = useState(0);
  const [signDate, setSignDate] = useState(todayIso());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { label: "งวดที่ 1 (มัดจำ)", percent: 50, due: "" },
    { label: "งวดที่ 2 (ส่วนที่เหลือ)", percent: 50, due: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const percentSum = rows.reduce((s, r) => s + r.percent, 0);
  const installments = useMemo<ContractInstallment[]>(
    () => rows.map((r) => ({ label: r.label, percent: r.percent, amount: Math.round(total * r.percent) / 100, due: r.due })),
    [rows, total],
  );
  const canSave = !!clientId && total > 0 && percentSum === 100 && !saving;

  function pickPackage(id: string) {
    setPackageId(id);
    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      setPackageName(pkg.name);
      setTotal(pkg.price);
    }
  }

  function patchRow(i: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        clientId,
        signDate,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        packageName: packageName.trim() || undefined,
        totalAmount: total,
        installments,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">สร้างสัญญา</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ผู้ว่าจ้าง (ลูกค้า)</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">แพ็คเกจ (เลือกเพื่อดึงราคา)</span>
              <select value={packageId} onChange={(e) => pickPackage(e.target.value)} className={field}>
                <option value="">ไม่เลือก / กรอกเอง</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อแพ็คเกจในสัญญา</span>
              <input value={packageName} onChange={(e) => setPackageName(e.target.value)} className={field} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">มูลค่าสัญญารวม (บาท)</span>
            <input type="number" min={0} value={total || ""} onChange={(e) => setTotal(Number(e.target.value))} className={field} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">วันที่ทำสัญญา</span>
              <input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เริ่มสัญญา</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">สิ้นสุดสัญญา</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-gray-500">งวดการชำระเงิน (ว่างวันที่ = ชำระ ณ วันลงนาม)</span>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_110px_96px] items-center gap-2">
                  <input value={r.label} onChange={(e) => patchRow(i, { label: e.target.value })} className={field} />
                  <div className="relative">
                    <input type="number" min={0} max={100} value={r.percent} onChange={(e) => patchRow(i, { percent: Number(e.target.value) })} className={`${field} pr-5`} />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                  <input type="date" value={r.due} onChange={(e) => patchRow(i, { due: e.target.value })} className={`${field} px-2`} />
                  <span className="text-right text-sm text-gray-700">฿{baht(installments[i].amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex gap-3">
                <button onClick={() => setRows((p) => [...p, { label: `งวดที่ ${p.length + 1}`, percent: 0, due: "" }])} className="font-medium text-brand-600 hover:underline">
                  + เพิ่มงวด
                </button>
                {rows.length > 1 && (
                  <button onClick={() => setRows((p) => p.slice(0, -1))} className="font-medium text-gray-500 hover:underline">
                    ลบงวดสุดท้าย
                  </button>
                )}
              </div>
              <span className={percentSum === 100 ? "text-emerald-600" : "text-rose-500"}>รวม {percentSum}% {percentSum === 100 ? "" : "(ต้องครบ 100%)"}</span>
            </div>
          </div>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            สร้างแล้วระบบจะนำแม่แบบสัญญามาเติมข้อมูลให้ จากนั้นแก้เนื้อหาเพิ่มได้ก่อนส่งให้ลูกค้าเซ็น
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={!canSave} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
            {saving ? "กำลังสร้าง..." : "สร้างสัญญา"}
          </button>
        </div>
      </div>
    </div>
  );
}
