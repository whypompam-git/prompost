"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/slug";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { FileText, Package as PackageIcon, Printer, Receipt as ReceiptIcon, Save } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { ClientSubNav } from "@/components/clients/ClientSubNav";
import { calcQuotationTotals } from "@/lib/accounting";
import {
  getClient,
  listClientPackages,
  listPackages,
  listQuotations,
  listReceipts,
  updateClientRow,
} from "@/lib/supabase/queries";
import type { Client, ClientPackage, EntityType, Package, PaymentStatus, Quotation, Receipt } from "@/lib/types";
import { cn } from "@/lib/utils";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const dateLabel = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: th });

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const labelClass = "mb-1 block text-xs font-medium text-gray-500";

export default function ClientInfoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [myPackages, setMyPackages] = useState<{ assignment: ClientPackage; pkg: Package | undefined }[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([getClient(params.id), listClientPackages(), listPackages(), listQuotations(), listReceipts()])
      .then(([c, assignments, packages, q, r]) => {
        if (!c) {
          setNotFound(true);
          return;
        }
        setClient(c);
        setMyPackages(
          assignments
            .filter((a) => a.clientId === params.id)
            .map((a) => ({ assignment: a, pkg: packages.find((p) => p.id === a.packageId) })),
        );
        setQuotations(q.filter((x) => x.clientId === params.id));
        setReceipts(r.filter((x) => x.clientId === params.id));
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function patch(fields: Partial<Client>) {
    setClient((prev) => (prev ? { ...prev, ...fields } : prev));
  }

  async function handleSave() {
    if (!client) return;
    setSaving(true);
    try {
      await updateClientRow(client.id, client);
      const fresh = await getClient(client.id);
      if (fresh) setClient(fresh);
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar back="/clients" title="ลูกค้า" subtitle="" />
        <LoadingView />
      </>
    );
  }

  if (notFound || !client) {
    return (
      <>
        <Topbar back="/clients" title="ไม่พบลูกค้ารายนี้" subtitle="" />
        <div className="p-6">
          <button onClick={() => router.push("/clients")} className="text-sm text-brand-600 hover:underline">
            &larr; กลับไปหน้าลูกค้า
          </button>
        </div>
      </>
    );
  }

  const taxIdLabel = client.entityType === "individual" ? "เลขประจำตัวผู้เสียภาษี" : "เลขทะเบียนนิติบุคคล";

  return (
    <>
      <Topbar back="/clients" title={client.name} subtitle="ข้อมูลลูกค้า" />
      <ClientSubNav clientId={client.id} />
      <div className="flex-1 space-y-4 p-6">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>

        <Card className="space-y-4">
          <div>
            <label className={labelClass}>ชื่อภาษาอังกฤษ (ใช้ทำลิงก์ลูกค้า)</label>
            <input
              value={client.nameEn ?? ""}
              onChange={(e) => patch({ nameEn: e.target.value })}
              placeholder="เช่น Gravita"
              className={inputClass}
            />
            <p className="mt-1 break-all text-xs text-gray-400">
              ลิงก์: prompost.vercel.app/{slugify(client.nameEn ?? "") || "…"}
              {client.slug && client.slug !== slugify(client.nameEn ?? "") && ` (ตอนนี้: /${client.slug})`}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>ชื่อร้าน/บริษัท</label>
              <input value={client.name} onChange={(e) => patch({ name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ชื่อผู้ติดต่อ</label>
              <input
                value={client.contactName ?? ""}
                onChange={(e) => patch({ contactName: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>เบอร์โทร</label>
              <input value={client.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>สถานะการชำระเงิน</label>
              <select
                value={client.paymentStatus}
                onChange={(e) => patch({ paymentStatus: e.target.value as PaymentStatus })}
                className={inputClass}
              >
                <option value="unpaid">ยังไม่ชำระ</option>
                <option value="deposit">มัดจำแล้ว</option>
                <option value="paid">ชำระครบแล้ว</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>ประเภทลูกค้า (สำหรับออกใบเสนอราคา)</label>
            <div className="flex overflow-hidden rounded-lg border border-gray-200 sm:w-1/2">
              {(
                [
                  { value: "company", label: "นิติบุคคล / บริษัท" },
                  { value: "individual", label: "บุคคลธรรมดา" },
                ] as { value: EntityType; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => patch({ entityType: opt.value })}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition",
                    client.entityType === opt.value ? "bg-brand-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>ชื่อสำหรับออกใบเสนอราคา (ชื่อบริษัท / ชื่อลูกค้า)</label>
            <input
              value={client.billingName ?? ""}
              onChange={(e) => patch({ billingName: e.target.value })}
              placeholder="เช่น บริษัท ทะพา ท่าอะไรก็รวย จำกัด"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">ถ้าเว้นว่าง จะใช้ชื่อร้านแทน</p>
          </div>

          <div>
            <label className={labelClass}>ที่อยู่ (แสดงบนใบเสนอราคา/ใบเสร็จ)</label>
            <textarea
              value={client.address ?? ""}
              onChange={(e) => patch({ address: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>

          <div className="sm:w-1/2">
            <label className={labelClass}>{taxIdLabel}</label>
            <input value={client.taxId ?? ""} onChange={(e) => patch({ taxId: e.target.value })} className={inputClass} />
          </div>
        </Card>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <PackageIcon size={15} />
            แพ็คเกจที่ซื้อ
          </h2>
          <Card className="space-y-2">
            {myPackages.map(({ assignment, pkg }) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{pkg?.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">เริ่มใช้ {dateLabel(assignment.assignedAt)}</p>
                </div>
                {pkg && <p className="text-sm font-semibold text-gray-900">฿{currency(pkg.price)}</p>}
              </div>
            ))}
            {myPackages.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">
                ยังไม่มีแพ็คเกจ — ไปเพิ่มได้ที่หน้า &quot;แพ็คเกจ&quot;
              </p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <FileText size={15} />
            ใบเสนอราคา
          </h2>
          <Card className="space-y-2">
            {quotations.map((q) => {
              const totals = calcQuotationTotals(q.items, q.vatPercent, q.whtPercent);
              return (
                <div key={q.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{q.quoteNo}</p>
                    <p className="text-xs text-gray-400">{dateLabel(q.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">฿{currency(totals.total)}</p>
                    <a
                      href={`/print/quotation/${q.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Printer size={14} />
                    </a>
                    <CopyLinkButton path={`/quote/${q.shareToken}`} label="ลิงก์" />
                  </div>
                </div>
              );
            })}
            {quotations.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีใบเสนอราคา</p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <ReceiptIcon size={15} />
            ใบเสร็จรับเงิน
          </h2>
          <Card className="space-y-2">
            {receipts.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.receiptNo}</p>
                  <p className="text-xs text-gray-400">{dateLabel(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">฿{currency(r.amount)}</p>
                  <a
                    href={`/print/receipt/${r.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Printer size={14} />
                  </a>
                  <CopyLinkButton path={`/receipt/${r.shareToken}`} label="ลิงก์" />
                </div>
              </div>
            ))}
            {receipts.length === 0 && <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีใบเสร็จ</p>}
          </Card>
        </section>
      </div>
    </>
  );
}
