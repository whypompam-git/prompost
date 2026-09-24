"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientModal, type ClientFormValues } from "@/components/clients/ClientModal";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import {
  assignPackageToClient,
  createClientRow,
  deleteClientRow,
  listClients,
  listPackages,
  setClientPortalEnabled,
} from "@/lib/supabase/queries";
import { clientLinkPath } from "@/lib/slug";
import type { Client, Package } from "@/lib/types";

const PAYMENT_LABEL = {
  unpaid: "ยังไม่ชำระ",
  deposit: "มัดจำแล้ว",
  paid: "ชำระครบแล้ว",
} as const;

const PAYMENT_STYLE = {
  unpaid: "bg-rose-100 text-rose-700",
  deposit: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
} as const;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    Promise.all([listClients(), listPackages()])
      .then(([c, p]) => {
        setClients(c);
        setPackages(p);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(values: ClientFormValues, packageId?: string) {
    const created = await createClientRow(values);
    if (packageId) await assignPackageToClient(created.id, packageId);
    setClients((prev) => [created, ...prev]);
    setCreating(false);
  }

  async function togglePortal(client: Client) {
    const enable = !client.portalEnabled;
    if (
      !enable &&
      !window.confirm(
        `ยกเลิกลิงก์ของ "${client.name}"? ลูกค้าจะเข้าดูงาน/ใบเสนอราคา/ใบแจ้งหนี้/ใบเสร็จผ่านลิงก์ไม่ได้ (เปิดใหม่ได้ภายหลัง)`,
      )
    )
      return;
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, portalEnabled: enable } : c)));
    try {
      await setClientPortalEnabled(client.id, enable);
    } catch (err) {
      console.error(err);
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, portalEnabled: !enable } : c)));
      window.alert("ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handleDelete(client: Client) {
    if (!window.confirm(`ลบลูกค้า "${client.name}" ใช่ไหม? งานที่เกี่ยวข้องทั้งหมดจะถูกลบไปด้วย`)) return;
    setClients((prev) => prev.filter((c) => c.id !== client.id));
    try {
      await deleteClientRow(client.id);
    } catch (err) {
      console.error(err);
      setClients((prev) => [client, ...prev]);
      window.alert("ลบไม่สำเร็จ — อาจมีใบเสนอราคา/ใบเสร็จผูกอยู่ ลบรายการเหล่านั้นก่อน");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="ลูกค้า" subtitle="ข้อมูลลูกค้าและสถานะการชำระเงิน" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="ลูกค้า" subtitle="ข้อมูลลูกค้าและสถานะการชำระเงิน" />
      <div className="flex-1 space-y-4 p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มลูกค้าใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/clients/${client.id}`} className="font-semibold text-gray-900 hover:text-brand-600 hover:underline">
                    {client.name}
                  </Link>
                  <p className="text-sm text-gray-500">{client.contactName}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STYLE[client.paymentStatus]}`}
                  >
                    {PAYMENT_LABEL[client.paymentStatus]}
                  </span>
                  <Link
                    href={`/clients/${client.id}/info`}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="ข้อมูลลูกค้า"
                  >
                    <Info size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(client)}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="ลบลูกค้า"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">{client.phone}</p>
              {client.portalEnabled ? (
                <div className="flex flex-wrap items-center gap-2">
                  <CopyLinkButton path={clientLinkPath(client)} label="คัดลอกลิงก์ลูกค้า" />
                  <button
                    onClick={() => togglePortal(client)}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    ยกเลิกลิงก์
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                    ลิงก์ถูกยกเลิก
                  </span>
                  <button
                    onClick={() => togglePortal(client)}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    เปิดลิงก์อีกครั้ง
                  </button>
                </div>
              )}
              {client.slug && client.portalEnabled && (
                <p className="truncate text-xs text-gray-400">prompost.vercel.app/{client.slug}</p>
              )}
            </Card>
          ))}
          {clients.length === 0 && (
            <Card className="text-sm text-gray-400 sm:col-span-2 lg:col-span-3">
              ยังไม่มีลูกค้า — กด &quot;เพิ่มลูกค้าใหม่&quot; ด้านบน
            </Card>
          )}
        </div>
      </div>

      {creating && <ClientModal packages={packages} onClose={() => setCreating(false)} onSave={handleSave} />}
    </>
  );
}
