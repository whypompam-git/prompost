"use client";

import { useEffect, useState } from "react";
import { ClientRounds } from "@/components/clients/ClientRounds";
import { slugify } from "@/lib/slug";
import { useParams, useRouter } from "next/navigation";
import { Package as PackageIcon, Save } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientSubNav } from "@/components/clients/ClientSubNav";
import { PortalPinStatus } from "@/components/clients/PortalPinStatus";
import { getClient, updateClientRow, listStaff } from "@/lib/supabase/queries";
import type { Client, EntityType, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";


const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const labelClass = "mb-1 block text-xs font-medium text-gray-500";

export default function ClientInfoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  useEffect(() => {
    listStaff().then(setStaffList).catch(console.error);
  }, []);

  useEffect(() => {
    getClient(params.id)
      .then((c) => {
        if (!c) setNotFound(true);
        else setClient(c);
      })
      .catch((err) => {
        console.error(err);
        window.alert(`โหลดข้อมูลลูกค้าไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
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
              ลิงก์: prompost.app/{slugify(client.nameEn ?? "") || "…"}
              {client.slug && client.slug !== slugify(client.nameEn ?? "") && ` (ตอนนี้: /${client.slug})`}
            </p>
            <PortalPinStatus clientId={client.id} />
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

          <div className="sm:w-1/2">
            <label className={labelClass}>คนดูแล</label>
            <select
              value={client.managerId ?? ""}
              onChange={(e) => patch({ managerId: e.target.value || undefined })}
              className={inputClass}
            >
              <option value="">ยังไม่มีคนดูแล</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:w-1/4">
            <label className={labelClass}>ความสำคัญ (ตัวเลขไว้จัดเรียงในหน้าลูกค้า)</label>
            <input
              type="number"
              value={client.priority || ""}
              placeholder="0"
              onChange={(e) => patch({ priority: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
        </Card>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <PackageIcon size={15} />
            แพ็คเกจและเอกสาร
          </h2>
          <ClientRounds client={client} />
        </section>
      </div>
    </>
  );
}
