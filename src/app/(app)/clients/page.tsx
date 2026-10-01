"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, History, Info, MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientModal, type ClientFormValues } from "@/components/clients/ClientModal";
import { ClientHistoryModal } from "@/components/clients/ClientHistoryModal";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import {
  assignPackageToClient,
  createClientRow,
  deleteClientRow,
  listClientPackages,
  listClients,
  listInvoices,
  listLatestClientNotes,
  listPackages,
  listQuotations,
  listReceipts,
  setClientPaymentStatus,
  setClientPortalEnabled,
} from "@/lib/supabase/queries";
import { clientLinkPath } from "@/lib/slug";
import type { Client, ClientNote, ClientPackage, Invoice, Package, PaymentStatus, Quotation, Receipt } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "ยังไม่ชำระ",
  confirmed: "เซ็นคอนเฟิม รอมัดจำ",
  deposit: "มัดจำแล้ว",
  paid: "ชำระครบแล้ว",
  declined: "ปฏิเสธ",
};

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-rose-100 text-rose-700",
  confirmed: "bg-sky-100 text-sky-700",
  deposit: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  declined: "bg-gray-200 text-gray-600",
};

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [latestNotes, setLatestNotes] = useState<Record<string, ClientNote>>({});
  const [historyFor, setHistoryFor] = useState<Client | null>(null);

  useEffect(() => {
    Promise.all([
      listClients(),
      listPackages(),
      listClientPackages(),
      listReceipts(),
      listQuotations(),
      listInvoices(),
      listLatestClientNotes().catch((err) => {
        console.error(err);
        return {};
      }),
    ])
      .then(([c, p, cp, r, q, inv, notes]) => {
        setClients(c);
        setPackages(p);
        setClientPackages(cp);
        setReceipts(r);
        setQuotations(q);
        setInvoices(inv);
        setLatestNotes(notes);
      })
      .catch((err) => {
        console.error(err);
        window.alert("โหลดข้อมูลลูกค้าไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง");
      })
      .finally(() => setLoading(false));
  }, []);

  const packageNames = useMemo(() => {
    const byClient: Record<string, string[]> = {};
    for (const cp of clientPackages) {
      const name = packages.find((p) => p.id === cp.packageId)?.name;
      if (!name) continue;
      (byClient[cp.clientId] ??= []).push(name);
    }
    return byClient;
  }, [clientPackages, packages]);

  const paidTotal = useMemo(() => {
    const byClient: Record<string, number> = {};
    for (const r of receipts) byClient[r.clientId] = (byClient[r.clientId] ?? 0) + r.amount;
    return byClient;
  }, [receipts]);

  const docCount = useMemo(() => {
    const byClient: Record<string, number> = {};
    const bump = (id: string) => (byClient[id] = (byClient[id] ?? 0) + 1);
    quotations.forEach((q) => bump(q.clientId));
    invoices.forEach((i) => bump(i.clientId));
    receipts.forEach((r) => bump(r.clientId));
    return byClient;
  }, [quotations, invoices, receipts]);

  async function handleSave(values: ClientFormValues, packageId?: string) {
    const created = await createClientRow(values);
    if (packageId) await assignPackageToClient(created.id, packageId);
    setClients((prev) => [created, ...prev]);
    setCreating(false);
  }

  async function handleStatusChange(client: Client, status: PaymentStatus) {
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, paymentStatus: status } : c)));
    try {
      await setClientPaymentStatus(client.id, status);
    } catch (err) {
      console.error(err);
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, paymentStatus: client.paymentStatus } : c)));
      window.alert("เปลี่ยนสถานะไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
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
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มลูกค้าใหม่
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium">ชื่อร้าน</th>
                <th className="px-4 py-3 font-medium">ผู้ติดต่อ</th>
                <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                <th className="px-4 py-3 font-medium">ประวัติการคุยล่าสุด</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">แพ็คเกจ</th>
                <th className="px-4 py-3 font-medium text-right">จ่ายแล้ว</th>
                <th className="px-4 py-3 font-medium text-center">เอกสาร</th>
                <th className="px-4 py-3 font-medium">ลิงก์ลูกค้า</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => {
                const note = latestNotes[client.id];
                return (
                  <tr key={client.id} className="align-top hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/clients/${client.id}`} className="hover:text-brand-600 hover:underline">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.contactName || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{client.phone || "—"}</td>
                    <td className="max-w-[260px] px-4 py-3">
                      <button
                        onClick={() => setHistoryFor(client)}
                        className="flex w-full items-start gap-1.5 text-left text-xs text-gray-500 hover:text-brand-600"
                      >
                        {note ? <History size={13} className="mt-0.5 shrink-0" /> : <MessageSquarePlus size={13} className="mt-0.5 shrink-0" />}
                        <span className="line-clamp-2">{note ? note.note : "ยังไม่มีประวัติ — กดเพื่อเพิ่ม"}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("relative inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", PAYMENT_STYLE[client.paymentStatus])}>
                        {PAYMENT_LABEL[client.paymentStatus]}
                        <select
                          value={client.paymentStatus}
                          onChange={(e) => handleStatusChange(client, e.target.value as PaymentStatus)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label="เปลี่ยนสถานะ"
                        >
                          {(Object.keys(PAYMENT_LABEL) as PaymentStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {PAYMENT_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </span>
                    </td>
                    <td className="max-w-[160px] px-4 py-3 text-xs text-gray-500">
                      {(packageNames[client.id] ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {paidTotal[client.id] ? `฿${currency(paidTotal[client.id])}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/clients/${client.id}/info`}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        <FileText size={12} />
                        {docCount[client.id] ?? 0}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {client.portalEnabled ? (
                        <div className="flex flex-col items-start gap-1">
                          <CopyLinkButton path={clientLinkPath(client)} label="คัดลอกลิงก์" />
                          <button onClick={() => togglePortal(client)} className="text-xs font-medium text-rose-500 hover:underline">
                            ยกเลิกลิงก์
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">ยกเลิกแล้ว</span>
                          <button onClick={() => togglePortal(client)} className="text-xs font-medium text-brand-600 hover:underline">
                            เปิดอีกครั้ง
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
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
                    </td>
                  </tr>
                );
              })}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                    ยังไม่มีลูกค้า — กด &quot;เพิ่มลูกค้าใหม่&quot; ด้านบน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating && <ClientModal packages={packages} onClose={() => setCreating(false)} onSave={handleSave} />}
      {historyFor && (
        <ClientHistoryModal
          client={historyFor}
          onClose={() => {
            setHistoryFor(null);
            listLatestClientNotes().then(setLatestNotes);
          }}
        />
      )}
    </>
  );
}
