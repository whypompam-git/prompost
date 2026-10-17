"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, Eye, Save, Send, Undo2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClauseEditor } from "@/components/contracts/ClauseEditor";
import { findPlaceholders } from "@/lib/contractTemplate";
import { getContract, setContractStatus, updateContractRow } from "@/lib/supabase/queries";
import type { Contract, ContractParty } from "@/lib/types";

const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

function PartyFields({ title, party, onChange }: { title: string; party: ContractParty; onChange: (p: ContractParty) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <input value={party.name} onChange={(e) => onChange({ ...party, name: e.target.value })} placeholder="ชื่อ" className={field} />
      <textarea value={party.address} onChange={(e) => onChange({ ...party, address: e.target.value })} placeholder="ที่อยู่" rows={2} className={field} />
      <div className="grid grid-cols-2 gap-2">
        <input value={party.taxId} onChange={(e) => onChange({ ...party, taxId: e.target.value })} placeholder="เลขผู้เสียภาษี / บัตรประชาชน" className={field} />
        <input value={party.phone} onChange={(e) => onChange({ ...party, phone: e.target.value })} placeholder="โทรศัพท์" className={field} />
      </div>
    </div>
  );
}

export default function ContractEditorPage() {
  const params = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getContract(params.id)
      .then(setContract)
      .catch((err) => {
        console.error(err);
        window.alert(`โหลดสัญญาไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function persist(c: Contract) {
    await updateContractRow(c.id, {
      title: c.title,
      signDate: c.signDate,
      startDate: c.startDate,
      endDate: c.endDate,
      packageName: c.packageName,
      totalAmount: c.totalAmount,
      installments: c.installments,
      parties: c.parties,
      intro: c.intro,
      clauses: c.clauses,
      closing: c.closing,
    });
  }

  async function handleSave() {
    if (!contract) return;
    setSaving(true);
    try {
      await persist(contract);
    } catch (err) {
      console.error(err);
      window.alert(`บันทึกไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!contract) return;
    const left = findPlaceholders([contract.intro, contract.closing, ...contract.clauses.flatMap((c) => [c.heading, c.body])]);
    if (left.length > 0 && !window.confirm(`ยังมีช่องที่ไม่ได้กรอก ${left.length} จุด:\n${left.slice(0, 6).join("\n")}\n\nส่งให้ลูกค้าเซ็นทั้งอย่างนี้เลยไหม?`)) return;
    if (!window.confirm("ส่งสัญญาให้ลูกค้าเซ็น? หลังลูกค้าเซ็นแล้วจะแก้ไขสัญญาไม่ได้")) return;
    setSaving(true);
    try {
      await persist(contract);
      await setContractStatus(contract.id, "sent");
      setContract({ ...contract, status: "sent" });
    } catch (err) {
      console.error(err);
      window.alert(`ส่งไม่สำเร็จ${err instanceof Error ? `: ${err.message}` : ""}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsend() {
    if (!contract) return;
    await setContractStatus(contract.id, "draft");
    setContract({ ...contract, status: "draft" });
  }

  async function copyLink() {
    if (!contract) return;
    await navigator.clipboard.writeText(`${window.location.origin}/contract/${contract.shareToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <>
        <Topbar back="/documents" title="สัญญา" subtitle="" />
        <LoadingView />
      </>
    );
  }
  if (!contract) {
    return (
      <>
        <Topbar back="/documents" title="ไม่พบสัญญา" subtitle="" />
      </>
    );
  }
  if (contract.status === "signed") {
    return (
      <>
        <Topbar back="/documents" title={contract.contractNo} subtitle="ลงนามแล้ว — แก้ไขไม่ได้" />
        <div className="p-6">
          <Link href={`/print/contract/${contract.id}`} className="text-sm font-medium text-brand-600 hover:underline">
            เปิดดูสัญญาที่ลงนามแล้ว
          </Link>
        </div>
      </>
    );
  }

  const patch = (p: Partial<Contract>) => setContract({ ...contract, ...p });

  return (
    <>
      <Topbar
        back="/documents"
        title={contract.contractNo}
        subtitle={contract.status === "sent" ? "ส่งให้ลูกค้าเซ็นแล้ว — รอลงนาม" : "ร่าง — ยังไม่ส่งให้ลูกค้า"}
      />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Save size={15} />
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          <Link href={`/print/contract/${contract.id}`} target="_blank" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Eye size={15} />
            ดูตัวอย่าง (บันทึกก่อน)
          </Link>
          {contract.status === "draft" ? (
            <button onClick={handleSend} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40">
              <Send size={15} />
              ส่งให้ลูกค้าเซ็น
            </button>
          ) : (
            <>
              <button onClick={copyLink} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600">
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์ให้ลูกค้าเซ็น"}
              </button>
              <button onClick={handleUnsend} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                <Undo2 size={15} />
                ถอนกลับเป็นร่าง
              </button>
            </>
          )}
        </div>

        <Card className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อสัญญา</span>
              <input value={contract.title} onChange={(e) => patch({ title: e.target.value })} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">ยอดรวม (แสดงในลิสต์)</span>
              <input type="number" value={contract.totalAmount || ""} onChange={(e) => patch({ totalAmount: Number(e.target.value) })} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">วันที่ทำสัญญา</span>
              <input type="date" value={contract.signDate} onChange={(e) => patch({ signDate: e.target.value })} className={field} />
            </label>
          </div>
          <p className="text-xs text-gray-400">ตัวเลข วันที่ และงวดชำระในเนื้อสัญญาเป็นข้อความธรรมดา — ถ้าแก้ยอดหรือวันที่ ให้แก้ในข้อที่เกี่ยวข้องด้านล่างด้วย</p>
        </Card>

        <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <PartyFields title="ผู้ว่าจ้าง (ลูกค้า)" party={contract.parties.client} onChange={(p) => patch({ parties: { ...contract.parties, client: p } })} />
          <PartyFields title="ผู้รับจ้าง" party={contract.parties.seller} onChange={(p) => patch({ parties: { ...contract.parties, seller: p } })} />
        </Card>

        <Card>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ข้อความนำ</span>
            <textarea value={contract.intro} onChange={(e) => patch({ intro: e.target.value })} rows={2} className={field} />
          </label>
        </Card>

        <ClauseEditor clauses={contract.clauses} onChange={(clauses) => patch({ clauses })} />

        <Card>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ข้อความปิดท้าย</span>
            <textarea value={contract.closing} onChange={(e) => patch({ closing: e.target.value })} rows={2} className={field} />
          </label>
        </Card>
      </div>
    </>
  );
}
