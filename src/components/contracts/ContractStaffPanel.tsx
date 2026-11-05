"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { bangkokDay } from "@/lib/alerts";
import { freelanceProgress, monthlyProgress, withholdingFor } from "@/lib/contractProgress";
import {
  createContractPayment,
  listContractPayments,
  loadContractProgressSource,
  type ContractPayment,
  type ProgressSource,
} from "@/lib/supabase/queries";
import type { Contract } from "@/lib/types";

const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const baht = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

// Signed team-member contract: what has been delivered, and the payment vouchers (signed online by the payee).
export function ContractStaffPanel({ contract }: { contract: Contract }) {
  const today = bangkokDay(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [source, setSource] = useState<ProgressSource | null>(null);
  const [payments, setPayments] = useState<ContractPayment[]>([]);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    loadContractProgressSource(contract).then(setSource).catch((e) => console.error(e));
    listContractPayments(contract.id).then(setPayments).catch((e) => console.error(e));
  }, [contract]);

  const isMonthly = contract.kind === "monthly";
  const progress = useMemo(() => {
    if (!source) return null;
    return isMonthly
      ? { kind: "monthly" as const, ...monthlyProgress(contract.staffId ?? "", month, source.tasks, source.queues, today) }
      : { kind: "freelance" as const, ...freelanceProgress(contract.id, source.tasks) };
  }, [source, isMonthly, contract, month, today]);

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);

  // suggested amount: the month's fee, or passed clips × price minus what was already paid
  useEffect(() => {
    if (!progress) return;
    if (progress.kind === "monthly") {
      setAmount(contract.terms.monthlyFee ?? 0);
      setDescription(`ค่าบริการเดือน ${month}`);
    } else {
      const due = Math.max(0, progress.passed * (contract.pricePerClip ?? 0) - paidTotal);
      setAmount(due);
      setDescription(`ค่าตัดต่อ ${progress.passed} คลิป (สัญญา ${contract.contractNo})`);
    }
  }, [progress, contract, month, paidTotal]);

  const withholding = withholdingFor(amount, contract.terms.withholding);

  async function create() {
    if (amount <= 0) return;
    if (progress?.kind === "monthly") {
      const short = (contract.terms.clipsPerMonth ?? 0) > progress.clipsPassed || (contract.terms.shootDaysPerMonth ?? 0) > progress.shootDays;
      if (short && !window.confirm("ผลงานเดือนนี้ยังไม่ครบเป้าในสัญญา — จ่ายเต็มจำนวนตามที่กรอกไหม?")) return;
    }
    if (!window.confirm(`สร้างใบสำคัญรับเงิน ฿${baht(amount - withholding)} (สุทธิ) และลงบัญชีเป็นรายจ่าย?`)) return;
    setSaving(true);
    try {
      const p = await createContractPayment({
        contractId: contract.id,
        payeeName: contract.parties.client.name,
        period: isMonthly ? month : undefined,
        description,
        amount,
        withholding,
        paidAt,
      });
      setPayments((prev) => [p, ...prev]);
    } catch (err) {
      window.alert(`สร้างไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    } finally {
      setSaving(false);
    }
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/voucher/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">ผลงานตามสัญญา</p>
          {isMonthly && <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" />}
        </div>
        {!progress ? (
          <p className="text-sm text-gray-400">กำลังโหลด…</p>
        ) : progress.kind === "monthly" ? (
          <p className="text-sm text-gray-700">
            คลิปที่ผ่าน QC (ตามวันตัดต่อในเดือนนี้): <b>{progress.clipsPassed}</b> / {contract.terms.clipsPerMonth || "-"} · มีในแผน {progress.clipsPlanned} คลิป
            <br />
            วันลงถ่าย: <b>{progress.shootDays}</b> / {contract.terms.shootDaysPerMonth || "-"} วัน
          </p>
        ) : (
          <p className="text-sm text-gray-700">
            ผูกกับสัญญานี้ {progress.assigned} / {contract.clipCount ?? "-"} คลิป · ส่งแล้ว {progress.delivered} · ผ่าน QC <b>{progress.passed}</b>
            {contract.clipCount && progress.passed >= contract.clipCount ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">ครบสัญญาแล้ว — พิจารณาต่อสัญญา</span> : null}
            <br />
            <span className="text-xs text-gray-400">คลิปที่มอบให้ {contract.parties.client.name} ตัดต่อ จะผูกกับสัญญาที่เซ็นแล้วและยังไม่เต็มโดยอัตโนมัติ</span>
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-gray-700">ใบสำคัญรับเงิน (ผู้รับเงินเซ็นออนไลน์)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} sm:col-span-2`} placeholder="รายการ" />
          <input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className={field} placeholder="จำนวนเงิน" />
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={field} />
        </div>
        <p className="text-xs text-gray-500">
          {withholding > 0 ? `หักภาษี ณ ที่จ่าย 3% = ฿${baht(withholding)} · ` : ""}จ่ายสุทธิ ฿{baht(amount - withholding)} · จ่ายไปแล้วทั้งหมด ฿{baht(paidTotal)}
        </p>
        <button onClick={create} disabled={saving || amount <= 0} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
          {saving ? "กำลังสร้าง…" : "สร้างใบสำคัญรับเงิน + ลงบัญชี"}
        </button>
        {payments.length > 0 && (
          <div className="divide-y divide-gray-100 text-sm">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-gray-700">
                  {p.paidAt} · {p.description} · ฿{baht(p.net)}
                </span>
                <span className="flex items-center gap-2">
                  {p.payeeSignedAt ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">เซ็นรับแล้ว</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">รอเซ็นรับ</span>
                  )}
                  <button onClick={() => copy(p.receiptToken)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                    {copied === p.receiptToken ? <Check size={12} /> : <Copy size={12} />} ลิงก์
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
