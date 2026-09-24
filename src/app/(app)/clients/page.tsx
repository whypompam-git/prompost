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
  confirmed: "เซ็นคอนเฟิม รอมัดจำ",
  deposit: "มัดจำแล้ว",
  paid: "ชำระครบแล้ว",
  declined: "ปฏิเสธ",
} as const;

const PAYMENT_STYLE = {
  unpaid: "bg-rose-100 text-rose-700",
  confirmed: "bg-sky-100 text-sky-700",
  deposit: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  declined: "bg-gray-200 text-gray-600",
} as const;

const GROUPS: {
  key: string;
  title: string;
  hint: string;
  dot: string;
  match: (s: Client["paymentStatus"]) => boolean;
}[] = [
  { key: "confirmed", title: "ยืนยันแล้ว", hint: "เซ็นคอนเฟิม / มัดจำแล้ว / ชำระครบ", dot: "bg-emerald-500", match: (s) => s !== "unpaid" && s !== "declined" },
  { key: "inquiry", title: "สอบถามใบเสนอราคา", hint: "ยังไม่ชำระ", dot: "bg-amber-500", match: (s) => s === "unpaid" },
  { key: "declined", title: "ปฏิเสธแล้ว", hint: "ไม่รับงาน / ปฏิเสธใบเสนอราคา", dot: "bg-gray-400", match: (s) => s === "declined" },
];

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
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มลูกค้าใหม่
          </button>
        </div>

        {GROUPS.map((g) => {
          const list = clients.filter((c) => g.match(c.paymentStatus));
          return (
            <section key={g.key}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} />
                <h2 className="text-sm font-semibold text-gray-800">{g.title}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {list.length} เจ้า
                </span>
                <span className="text-xs text-gray-400">{g.hint}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((client) => (
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
          {list.length === 0 && (
            <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-gray-400 sm:col-span-2 lg:col-span-3">
              ไม่มีลูกค้าในกลุ่มนี้
            </p>
          )}
              </div>
            </section>
          );
        })}
        {clients.length === 0 && (
          <Card className="text-sm text-gray-400">ยังไม่มีลูกค้า — กด &quot;เพิ่มลูกค้าใหม่&quot; ด้านบน</Card>
        )}
      </div>

      {creating && <ClientModal packages={packages} onClose={() => setCreating(false)} onSave={handleSave} />}
    </>
  );
}
