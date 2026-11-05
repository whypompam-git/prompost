"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { KIND_LABEL } from "@/lib/contractTemplate";
import { depositInstallments, monthlyInstallments, termEndDate } from "@/lib/contractInstallments";
import type { Client, ContractInstallment, ContractKind, ContractTerms, Package, PaymentMode, Staff } from "@/lib/types";
import type { NewContractValues } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

const todayIso = () => new Date().toISOString().slice(0, 10);
const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const baht = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

export type CreateContractValues = NewContractValues;

type Row = { label: string; percent: number; due: string };

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-xs font-medium text-gray-500">{children}</span>;
}

export function CreateContractModal({
  clients,
  staff,
  packages,
  initialKind = "client",
  onClose,
  onSave,
}: {
  clients: Client[];
  staff: Staff[];
  packages: Package[];
  initialKind?: ContractKind;
  onClose: () => void;
  onSave: (values: CreateContractValues) => Promise<void>;
}) {
  const [kind, setKind] = useState<ContractKind>(initialKind);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [packageId, setPackageId] = useState("");
  const [packageName, setPackageName] = useState("");
  const [total, setTotal] = useState(0);
  const [signDate, setSignDate] = useState(todayIso());
  const [startDate, setStartDate] = useState(todayIso());
  const [months, setMonths] = useState(3);
  const [endDate, setEndDate] = useState(termEndDate(todayIso(), 3));
  const [endTouched, setEndTouched] = useState(false);
  const [mode, setMode] = useState<PaymentMode>("monthly");
  const [deposit, setDeposit] = useState(50);
  const [rows, setRows] = useState<Row[]>([
    { label: "งวดที่ 1 (มัดจำ)", percent: 50, due: "" },
    { label: "งวดที่ 2 (ส่วนที่เหลือ)", percent: 50, due: "" },
  ]);
  // monthly service
  const [terms, setTerms] = useState<ContractTerms>({ monthlyFee: 0, clipsPerMonth: 0, shootDaysPerMonth: 0, payDay: 30, noticeDays: 30, withholding: false });
  // freelance batch
  const [clipCount, setClipCount] = useState(10);
  const [pricePerClip, setPricePerClip] = useState(0);
  const [saving, setSaving] = useState(false);

  // end date follows start + months until edited by hand
  useEffect(() => {
    if (!endTouched && startDate && months > 0 && kind !== "freelance") setEndDate(termEndDate(startDate, months));
  }, [startDate, months, endTouched, kind]);

  useEffect(() => {
    if (kind === "monthly") setTotal((terms.monthlyFee ?? 0) * Math.max(months, 1));
    if (kind === "freelance") setTotal(clipCount * pricePerClip);
  }, [kind, terms.monthlyFee, months, clipCount, pricePerClip]);

  useEffect(() => {
    if (kind !== "client") {
      const p = staff.find((x) => x.id === staffId);
      if (p && kind === "monthly" && !terms.monthlyFee && p.baseSalary) setTerms((t) => ({ ...t, monthlyFee: p.baseSalary }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, kind]);

  const percentSum = rows.reduce((s, r) => s + r.percent, 0);
  const installments = useMemo<ContractInstallment[]>(() => {
    if (kind === "monthly") return monthlyInstallments(total, months, startDate);
    if (mode === "monthly") return monthlyInstallments(total, months, startDate);
    if (mode === "deposit") return depositInstallments(total, deposit, endDate);
    return rows.map((r) => ({ label: r.label, percent: r.percent, amount: Math.round(total * r.percent) / 100, due: r.due }));
  }, [kind, mode, rows, total, months, startDate, deposit, endDate]);

  const partyOk = kind === "client" ? !!clientId : !!staffId;
  const amountsOk = kind === "monthly" ? (terms.monthlyFee ?? 0) > 0 : kind === "freelance" ? clipCount > 0 && total > 0 : total > 0;
  const canSave = partyOk && amountsOk && months > 0 && (kind !== "client" || mode !== "custom" || percentSum === 100) && !saving;

  function pickPackage(id: string) {
    setPackageId(id);
    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      setPackageName(pkg.name);
      setTotal(pkg.price);
    }
  }

  const patchRow = (i: number, p: Partial<Row>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        kind,
        clientId: kind === "client" ? clientId : undefined,
        staffId: kind === "client" ? undefined : staffId,
        signDate,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        packageName: kind === "client" ? packageName.trim() || undefined : undefined,
        totalAmount: total,
        installments,
        termMonths: kind === "freelance" ? undefined : months,
        paymentMode: kind === "client" ? mode : kind === "monthly" ? "monthly" : mode,
        terms: kind === "monthly" ? terms : kind === "freelance" ? { withholding: terms.withholding } : {},
        clipCount: kind === "freelance" ? clipCount : undefined,
        pricePerClip: kind === "freelance" ? pricePerClip : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

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
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(Object.keys(KIND_LABEL) as ContractKind[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setKind(k);
                  if (k === "freelance") setMode("deposit");
                }}
                className={cn("flex-1 rounded-lg px-2 py-1.5 text-xs font-medium", kind === k ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>

          {kind === "client" ? (
            <label className="block">
              <Label>ผู้ว่าจ้าง (ลูกค้า)</Label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block">
              <Label>ผู้รับจ้าง ({kind === "monthly" ? "ทีมงานรายเดือน" : "Outsource"})</Label>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={field}>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-gray-400">เลขบัตรประชาชนและที่อยู่ ผู้รับจ้างกรอกเองตอนเซ็น (เห็นได้เฉพาะเจ้าของ)</span>
            </label>
          )}

          {kind === "client" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Label>แพ็คเกจ (เลือกเพื่อดึงราคา)</Label>
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
                <Label>ชื่อแพ็คเกจในสัญญา</Label>
                <input value={packageName} onChange={(e) => setPackageName(e.target.value)} className={field} />
              </label>
            </div>
          )}

          {kind === "monthly" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Label>ค่าบริการต่อเดือน (บาท)</Label>
                <input type="number" min={0} value={terms.monthlyFee || ""} onChange={(e) => setTerms({ ...terms, monthlyFee: num(e.target.value) })} className={field} />
              </label>
              <label className="block">
                <Label>จ่ายทุกวันที่</Label>
                <input type="number" min={1} max={31} value={terms.payDay || ""} onChange={(e) => setTerms({ ...terms, payDay: num(e.target.value) })} className={field} />
              </label>
              <label className="block">
                <Label>เป้าตัดต่อ (คลิป/เดือน)</Label>
                <input type="number" min={0} value={terms.clipsPerMonth || ""} onChange={(e) => setTerms({ ...terms, clipsPerMonth: num(e.target.value) })} className={field} />
              </label>
              <label className="block">
                <Label>เป้าลงถ่าย (วัน/เดือน)</Label>
                <input type="number" min={0} value={terms.shootDaysPerMonth || ""} onChange={(e) => setTerms({ ...terms, shootDaysPerMonth: num(e.target.value) })} className={field} />
              </label>
              <label className="block">
                <Label>แจ้งเลิกล่วงหน้า (วัน)</Label>
                <input type="number" min={0} value={terms.noticeDays ?? 30} onChange={(e) => setTerms({ ...terms, noticeDays: num(e.target.value) })} className={field} />
              </label>
            </div>
          )}

          {kind === "freelance" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Label>จำนวนคลิปในชุดนี้</Label>
                <input type="number" min={1} value={clipCount || ""} onChange={(e) => setClipCount(num(e.target.value))} className={field} />
              </label>
              <label className="block">
                <Label>ราคาต่อคลิป (บาท)</Label>
                <input type="number" min={0} value={pricePerClip || ""} onChange={(e) => setPricePerClip(num(e.target.value))} className={field} />
              </label>
            </div>
          )}

          {kind !== "client" && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!terms.withholding} onChange={(e) => setTerms({ ...terms, withholding: e.target.checked })} />
              หักภาษี ณ ที่จ่าย 3% (ไม่ติ๊ก = จ่ายเต็ม ผู้รับจ้างยื่นภาษีเอง)
            </label>
          )}

          <label className="block">
            <Label>{kind === "monthly" ? "มูลค่ารวมทั้งสัญญา (คำนวณจากค่าบริการ × เดือน)" : kind === "freelance" ? "ค่าจ้างรวม (คำนวณจากคลิป × ราคา แก้ได้)" : "มูลค่าสัญญารวม (บาท)"}</Label>
            <input type="number" min={0} value={total || ""} onChange={(e) => setTotal(num(e.target.value))} className={field} readOnly={kind === "monthly"} />
          </label>

          {kind !== "freelance" && (
            <div>
              <Label>ระยะสัญญา (เดือน) — กรอกเองได้</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input type="number" min={1} max={60} value={months || ""} onChange={(e) => { setMonths(num(e.target.value)); setEndTouched(false); }} className={cn(field, "w-24")} />
                {[1, 3, 6, 12].map((m) => (
                  <button key={m} onClick={() => { setMonths(m); setEndTouched(false); }} className={cn("rounded-full border px-3 py-1 text-xs", months === m ? "border-brand-300 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600")}>
                    {m} เดือน
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <Label>วันที่ทำสัญญา</Label>
              <input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <Label>เริ่มสัญญา</Label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <Label>{kind === "freelance" ? "ส่งครบภายใน" : "สิ้นสุดสัญญา"}</Label>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setEndTouched(true); }} className={field} />
            </label>
          </div>

          {kind !== "monthly" && (
            <div>
              <Label>รูปแบบการเก็บเงิน</Label>
              <div className="mb-2 flex gap-1.5">
                {(kind === "client"
                  ? ([["monthly", "รายเดือน"], ["deposit", "มัดจำ + ส่วนที่เหลือ"], ["custom", "กำหนดเอง"]] as const)
                  : ([["deposit", "มัดจำ + ส่งครบ"], ["custom", "กำหนดเอง"]] as const)
                ).map(([k, label]) => (
                  <button key={k} onClick={() => setMode(k)} className={cn("rounded-full border px-3 py-1 text-xs", mode === k ? "border-brand-300 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600")}>
                    {label}
                  </button>
                ))}
              </div>
              {mode === "deposit" && (
                <label className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                  มัดจำ
                  <input type="number" min={0} max={100} value={deposit} onChange={(e) => setDeposit(num(e.target.value))} className={cn(field, "w-20")} />%
                </label>
              )}
              {mode === "custom" && (
                <>
                  <div className="space-y-2">
                    {rows.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1fr_64px_110px_96px] items-center gap-2">
                        <input value={r.label} onChange={(e) => patchRow(i, { label: e.target.value })} className={field} />
                        <input type="number" min={0} max={100} value={r.percent} onChange={(e) => patchRow(i, { percent: num(e.target.value) })} className={field} />
                        <input type="date" value={r.due} onChange={(e) => patchRow(i, { due: e.target.value })} className={cn(field, "px-2")} />
                        <span className="text-right text-sm text-gray-700">฿{baht(installments[i]?.amount ?? 0)}</span>
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
                </>
              )}
            </div>
          )}

          {mode !== "custom" || kind === "monthly" ? (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <p className="mb-1 font-medium">งวดที่ระบบคำนวณให้</p>
              {installments.slice(0, 12).map((i, idx) => (
                <p key={idx}>
                  {i.label}: ฿{baht(i.amount)} {i.due ? `· ${i.due}` : "· วันลงนาม"}
                </p>
              ))}
              {installments.length > 12 && <p>… อีก {installments.length - 12} งวด</p>}
            </div>
          ) : null}

          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            สร้างแล้วระบบนำแม่แบบสัญญา{KIND_LABEL[kind]}มาเติมข้อมูลให้ จากนั้นแก้เนื้อหาได้ก่อนส่งให้เซ็น
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
