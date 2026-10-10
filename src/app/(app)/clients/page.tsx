"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  FileText,
  History,
  Info,
  MessageSquarePlus,
  Package as PackageIcon,
  Plus,
  Star,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
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
  listCurrentClientRounds,
  listInvoices,
  listLatestClientNotes,
  listPackages,
  listQuotations,
  listReceipts,
  recordRoundPayment,
  listStaff,
  setClientManager,
  setClientPaymentStatus,
  setClientPhone,
  setClientPortalEnabled,
  setClientPriority,
} from "@/lib/supabase/queries";
import { clientLinkPath } from "@/lib/slug";
import type { Client, ClientNote, ClientPackage, Invoice, Package, PaymentStatus, Quotation, Receipt, Staff } from "@/lib/types";
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

type SortKey = "priority" | "name" | "contactName" | "paymentStatus" | "paid" | "outstanding";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentRounds, setCurrentRounds] = useState<Record<string, ClientPackage>>({});
  const [latestNotes, setLatestNotes] = useState<Record<string, ClientNote>>({});
  const [historyFor, setHistoryFor] = useState<Client | null>(null);
  const [payFor, setPayFor] = useState<Client | null>(null);
  const [pickPackageFor, setPickPackageFor] = useState<Client | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [managerFilter, setManagerFilter] = useState("");

  async function loadAll() {
    const [c, p, cp, r, q, inv, notes, staffRows] = await Promise.all([
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
      listStaff().catch(() => [] as Staff[]),
    ]);
    setStaff(staffRows);
    setClients(c);
    setPackages(p);
    setReceipts(r);
    setQuotations(q);
    setInvoices(inv);
    setLatestNotes(notes);
    const byClient: Record<string, ClientPackage> = {};
    for (const row of cp) if (!byClient[row.clientId]) byClient[row.clientId] = row; // already newest-first
    setCurrentRounds(byClient);
  }

  useEffect(() => {
    loadAll()
      .catch((err) => {
        console.error(err);
        window.alert("โหลดข้อมูลลูกค้าไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง");
      })
      .finally(() => setLoading(false));
  }, []);

  // Paid-so-far for a client's CURRENT round only — receipts linked to that
  // round's id, not every receipt the client has ever had.
  const roundPaid = useMemo(() => {
    const byClient: Record<string, number> = {};
    for (const client of clients) {
      const round = currentRounds[client.id];
      if (!round) continue;
      byClient[client.id] = receipts
        .filter((r) => r.clientPackageId === round.id)
        .reduce((sum, r) => sum + r.amount, 0);
    }
    return byClient;
  }, [clients, currentRounds, receipts]);

  const roundOutstanding = (clientId: string) => {
    const round = currentRounds[clientId];
    if (!round) return 0;
    return Math.max(round.amount - (roundPaid[clientId] ?? 0), 0);
  };

  const docCount = useMemo(() => {
    const byClient: Record<string, number> = {};
    const bump = (id: string) => (byClient[id] = (byClient[id] ?? 0) + 1);
    quotations.forEach((q) => bump(q.clientId));
    invoices.forEach((i) => bump(i.clientId));
    receipts.forEach((r) => bump(r.clientId));
    return byClient;
  }, [quotations, invoices, receipts]);

  const summary = useMemo(() => {
    const totalBilled = clients.reduce((sum, c) => sum + (currentRounds[c.id]?.amount ?? 0), 0);
    const totalPaid = clients.reduce((sum, c) => sum + (roundPaid[c.id] ?? 0), 0);
    return { count: clients.length, totalBilled, totalPaid, totalOutstanding: Math.max(totalBilled - totalPaid, 0) };
  }, [clients, currentRounds, roundPaid]);

  const sortedClients = useMemo(() => {
    const base = managerFilter
      ? clients.filter((c) => (managerFilter === "none" ? !c.managerId : c.managerId === managerFilter))
      : clients;
    const sorted = [...base].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "th");
        case "contactName":
          return (a.contactName ?? "").localeCompare(b.contactName ?? "", "th");
        case "paymentStatus":
          return a.paymentStatus.localeCompare(b.paymentStatus);
        case "paid":
          return (roundPaid[a.id] ?? 0) - (roundPaid[b.id] ?? 0);
        case "outstanding":
          return roundOutstanding(a.id) - roundOutstanding(b.id);
        default:
          return a.priority - b.priority;
      }
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, sortBy, sortDir, roundPaid, currentRounds, managerFilter]);

  function handleSort(key: SortKey) {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  function SortHeader({ label, sortKey, className }: { label: React.ReactNode; sortKey: SortKey; className?: string }) {
    return (
      <th className={cn("px-4 py-3 font-medium", className)}>
        <button onClick={() => handleSort(sortKey)} className="flex items-center gap-1 hover:text-gray-600">
          {label}
          {sortBy === sortKey ? (
            sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          ) : (
            <ChevronsUpDown size={12} className="opacity-40" />
          )}
        </button>
      </th>
    );
  }

  async function handleSave(values: ClientFormValues, packageId?: string) {
    const created = await createClientRow(values);
    if (packageId) {
      await assignPackageToClient(created.id, packageId);
      await loadAll();
    }
    setClients((prev) => (packageId ? prev : [created, ...prev]));
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

  async function handleManagerChange(client: Client, managerId: string) {
    const next = managerId || undefined;
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, managerId: next } : c)));
    try {
      await setClientManager(client.id, next ?? null);
    } catch (err) {
      console.error(err);
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, managerId: client.managerId } : c)));
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handlePriorityChange(client: Client, priority: number) {
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, priority } : c)));
    try {
      await setClientPriority(client.id, priority);
    } catch (err) {
      console.error(err);
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, priority: client.priority } : c)));
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handlePhoneBlur(client: Client, phone: string) {
    if (phone === (client.phone ?? "")) return;
    try {
      await setClientPhone(client.id, phone);
    } catch (err) {
      console.error(err);
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, phone: client.phone } : c)));
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handlePickPackage(client: Client, pkg: Package) {
    const existing = currentRounds[client.id];
    const warn = existing
      ? `เริ่มรอบบิลใหม่ "${pkg.name}" (฿${currency(pkg.price)}) ให้ ${client.name}?\n\nยอด "จ่ายแล้ว/ค้างชำระ" จะเปลี่ยนไปตามรอบใหม่นี้ทันที และจะออกใบเสนอราคาใหม่ให้อัตโนมัติ`
      : `เริ่มรอบบิล "${pkg.name}" (฿${currency(pkg.price)}) ให้ ${client.name}? จะออกใบเสนอราคาให้อัตโนมัติ`;
    if (!window.confirm(warn)) return;
    setPickPackageFor(null);
    try {
      await assignPackageToClient(client.id, pkg.id);
      await loadAll();
    } catch (err) {
      console.error(err);
      window.alert("ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
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
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
          <StatCard label="ลูกค้าทั้งหมด" value={summary.count} icon={Users} tone="orange" />
          <StatCard label="ยอดรวม (รอบปัจจุบัน)" value={`฿${currency(summary.totalBilled)}`} icon={Wallet} tone="gray" />
          <StatCard label="จ่ายแล้ว" value={`฿${currency(summary.totalPaid)}`} icon={CheckCircle2} tone="emerald" />
          <StatCard label="รอจ่าย" value={`฿${currency(summary.totalOutstanding)}`} icon={AlertCircle} tone="amber" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            คนดูแล
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700"
            >
              <option value="">ทั้งหมด</option>
              <option value="none">ยังไม่มีคนดูแล</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มลูกค้าใหม่
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
          <table className="w-full min-w-[1600px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <SortHeader label={<Star size={13} />} sortKey="priority" className="w-14" />
                <SortHeader label="ชื่อร้าน" sortKey="name" />
                <SortHeader label="ผู้ติดต่อ" sortKey="contactName" />
                <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                <th className="px-4 py-3 font-medium">คนดูแล</th>
                <th className="px-4 py-3 font-medium">แบรนด์/บรีฟ</th>
                <th className="px-4 py-3 font-medium">ประวัติการคุยล่าสุด</th>
                <SortHeader label="สถานะ" sortKey="paymentStatus" />
                <th className="px-4 py-3 font-medium">แพ็คเกจ (รอบปัจจุบัน)</th>
                <SortHeader label="จ่ายแล้ว" sortKey="paid" className="text-right" />
                <SortHeader label="ค้างชำระ" sortKey="outstanding" className="text-right" />
                <th className="px-4 py-3 font-medium text-center">เอกสาร</th>
                <th className="px-4 py-3 font-medium">ลิงก์ลูกค้า</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedClients.map((client) => {
                const note = latestNotes[client.id];
                const round = currentRounds[client.id];
                const pkg = round ? packages.find((p) => p.id === round.packageId) : undefined;
                const paid = roundPaid[client.id] ?? 0;
                const outstanding = roundOutstanding(client.id);
                return (
                  <tr key={client.id} className="align-top hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={client.priority || ""}
                        placeholder="0"
                        onChange={(e) => handlePriorityChange(client, Number(e.target.value) || 0)}
                        className="w-12 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/clients/${client.id}`} className="hover:text-brand-600 hover:underline">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.contactName || "—"}</td>
                    <td className="px-4 py-3">
                      <input
                        value={client.phone ?? ""}
                        onChange={(e) => setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, phone: e.target.value } : c)))}
                        onBlur={(e) => handlePhoneBlur(client, e.target.value)}
                        placeholder="—"
                        className="w-32 rounded-lg border border-transparent px-2 py-1 text-gray-600 hover:border-gray-200 focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={client.managerId ?? ""}
                        onChange={(e) => handleManagerChange(client, e.target.value)}
                        className={cn(
                          "max-w-[140px] rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-gray-200 focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-300",
                          client.managerId ? "text-gray-700" : "text-gray-300",
                        )}
                        aria-label="คนดูแล"
                      >
                        <option value="">— ยังไม่มี —</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <Link
                        href={`/clients/${client.id}/brand`}
                        className="line-clamp-2 text-xs text-gray-500 hover:text-brand-600"
                      >
                        {client.brandBrief ? client.brandBrief : <span className="italic text-gray-300">กดเพื่อเพิ่มบรีฟแบรนด์</span>}
                      </Link>
                    </td>
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
                    <td className="max-w-[180px] px-4 py-3 text-xs">
                      <button
                        onClick={() => setPickPackageFor(client)}
                        className="flex items-center gap-1 text-gray-600 hover:text-brand-600"
                      >
                        <PackageIcon size={12} />
                        {pkg ? pkg.name : <span className="italic text-gray-300">เลือกแพ็คเกจ</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPayFor(client)}
                        disabled={!round}
                        className={cn("font-medium hover:underline", round ? "text-gray-900" : "text-gray-300")}
                      >
                        {round ? `฿${currency(paid)}` : "—"}
                      </button>
                    </td>
                    <td className={cn("px-4 py-3 text-right font-medium", outstanding > 0 ? "text-rose-600" : "text-gray-400")}>
                      {round ? `฿${currency(outstanding)}` : "—"}
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
              {sortedClients.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-gray-400">
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
      {pickPackageFor && (
        <PackagePickerModal
          client={pickPackageFor}
          packages={packages}
          onClose={() => setPickPackageFor(null)}
          onPick={(pkg) => handlePickPackage(pickPackageFor, pkg)}
        />
      )}
      {payFor && currentRounds[payFor.id] && (
        <RecordPaymentModal
          client={payFor}
          round={currentRounds[payFor.id]}
          alreadyPaid={roundPaid[payFor.id] ?? 0}
          onClose={() => setPayFor(null)}
          onSaved={async () => {
            setPayFor(null);
            await loadAll();
          }}
        />
      )}
    </>
  );
}

function PackagePickerModal({
  client,
  packages,
  onClose,
  onPick,
}: {
  client: Client;
  packages: Package[];
  onClose: () => void;
  onPick: (pkg: Package) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-base font-semibold text-gray-900">เลือกแพ็คเกจให้ {client.name}</h3>
        <p className="mb-3 text-xs text-gray-400">จะเริ่มรอบบิลใหม่ และออกใบเสนอราคาให้อัตโนมัติ</p>
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => onPick(pkg)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="font-medium text-gray-800">{pkg.name}</span>
              <span className="text-gray-500">฿{currency(pkg.price)}</span>
            </button>
          ))}
          {packages.length === 0 && <p className="py-4 text-center text-sm text-gray-400">ยังไม่มีแพ็คเกจ — ไปสร้างที่เมนู &quot;แพ็คเกจ&quot;</p>}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  client,
  round,
  alreadyPaid,
  onClose,
  onSaved,
}: {
  client: Client;
  round: ClientPackage;
  alreadyPaid: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState<number>(Math.max(round.amount - alreadyPaid, 0));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const outstanding = Math.max(round.amount - alreadyPaid, 0);

  async function handleSave() {
    if (amount <= 0) return;
    setSaving(true);
    try {
      await recordRoundPayment({ clientId: client.id, clientPackageId: round.id, amount, notes: notes.trim() || undefined });
      onSaved();
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-base font-semibold text-gray-900">บันทึกยอดที่ลูกค้าชำระ</h3>
        <p className="mb-3 text-xs text-gray-400">
          {client.name} — รอบนี้ ฿{currency(round.amount)} จ่ายแล้ว ฿{currency(alreadyPaid)} ค้าง ฿{currency(outstanding)}
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ยอดที่ชำระ (บาท)</span>
            <input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">หมายเหตุ (ถ้ามี)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
          </label>
          <p className="text-xs text-gray-400">จะออกใบเสร็จให้อัตโนมัติ (แก้ไขได้ทีหลังที่หน้าเอกสาร) และเพิ่มเข้าบัญชีรายรับทันที</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving || amount <= 0}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
