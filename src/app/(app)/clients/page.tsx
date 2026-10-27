"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
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
import { effectivePayments, roundBalance, type Round } from "@/lib/billing";
import { stripNoteMarkup } from "@/lib/noteMarkup";
import { summarizeStages } from "@/lib/workflow";
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
  listTransactions,
  recordRoundPayment,
  listStaff,
  listTaskStageRows,
  setClientManager,
  setClientPaymentStatus,
  setClientPhone,
  setClientPortalEnabled,
  setClientPriority,
} from "@/lib/supabase/queries";
import { clientLinkPath } from "@/lib/slug";
import { downloadCsv } from "@/lib/exportCsv";
import type { Client, ClientNote, ClientPackage, Invoice, Package, PaymentStatus, Quotation, Receipt, Staff, Transaction } from "@/lib/types";
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

const STAGE_COLS: { key: string; label: string; tone: string }[] = [
  { key: "total", label: "ทั้งหมด", tone: "bg-gray-800 text-white" },
  { key: "plan", label: "Plan", tone: "bg-violet-50 text-violet-700" },
  { key: "shoot", label: "ถ่าย", tone: "bg-sky-50 text-sky-700" },
  { key: "edit", label: "ตัดต่อ", tone: "bg-amber-50 text-amber-700" },
  { key: "pending", label: "Pending", tone: "bg-rose-50 text-rose-700" },
  { key: "approved", label: "ผ่าน", tone: "bg-emerald-50 text-emerald-700" },
  { key: "posted", label: "Post", tone: "bg-teal-50 text-teal-700" },
];

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allRounds, setAllRounds] = useState<ClientPackage[]>([]);
  const [taskStages, setTaskStages] = useState<{ clientId: string; type: string }[]>([]);

  async function loadAll() {
    const [c, p, cp, r, q, inv, notes, staffRows, stageRows, txRows] = await Promise.all([
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
      listTaskStageRows().catch(() => [] as { clientId: string; type: string }[]),
      listTransactions().catch(() => [] as Transaction[]),
    ]);
    setTransactions(txRows);
    setAllRounds(cp);
    setStaff(staffRows);
    setTaskStages(stageRows);
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

  // billed / paid / left for each client's CURRENT round, from one shared calculation:
  // billed = the round's quotation (package + extras) or the package price; paid =
  // receipts + deposits booked in accounting that have no receipt yet (see lib/billing.ts).
  const balances = useMemo(() => {
    const rounds: Round[] = allRounds.map((r) => ({ id: r.id, clientId: r.clientId, packageName: packages.find((p) => p.id === r.packageId)?.name, amount: r.amount, assignedAt: r.assignedAt }));
    const quotes = quotations.map((q) => ({ id: q.id, clientId: q.clientId, clientPackageId: q.clientPackageId, status: q.status, createdAt: q.createdAt, items: q.items, vatPercent: q.vatPercent, whtPercent: q.whtPercent }));
    const payments = effectivePayments(rounds, receipts.map((r) => ({ id: r.id, clientId: r.clientId, clientPackageId: r.clientPackageId, amount: r.amount, createdAt: r.createdAt })), transactions);
    const out: Record<string, { billed: number; paid: number; outstanding: number }> = {};
    for (const client of clients) {
      const cur = currentRounds[client.id];
      const round = cur && rounds.find((r) => r.id === cur.id);
      if (round) out[client.id] = roundBalance(round, quotes, payments);
    }
    return out;
  }, [clients, allRounds, currentRounds, packages, quotations, receipts, transactions]);
  const roundPaid = useMemo(() => Object.fromEntries(Object.entries(balances).map(([id, b]) => [id, b.paid])) as Record<string, number>, [balances]);
  const roundOutstanding = (clientId: string) => balances[clientId]?.outstanding ?? 0;

  const docCount = useMemo(() => {
    const byClient: Record<string, number> = {};
    const bump = (id: string) => (byClient[id] = (byClient[id] ?? 0) + 1);
    quotations.forEach((q) => bump(q.clientId));
    invoices.forEach((i) => bump(i.clientId));
    receipts.forEach((r) => bump(r.clientId));
    return byClient;
  }, [quotations, invoices, receipts]);

  const summary = useMemo(() => {
    const totalBilled = clients.reduce((sum, c) => sum + (balances[c.id]?.billed ?? 0), 0);
    const totalPaid = clients.reduce((sum, c) => sum + (roundPaid[c.id] ?? 0), 0);
    return { count: clients.length, totalBilled, totalPaid, totalOutstanding: Math.max(totalBilled - totalPaid, 0) };
  }, [clients, balances, roundPaid]);

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
      <th className={cn("px-3 py-3 font-medium", className)}>
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

  // ── column order (drag a header, or use ◀ ▶; remembered in this browser) ──
  const HEADS: Record<string, { label: React.ReactNode; sortKey?: SortKey; className?: string }> = {
    priority: { label: <Star size={13} />, sortKey: "priority", className: "w-14" },
    name: { label: "ชื่อร้าน", sortKey: "name" },
    contact: { label: "ผู้ติดต่อ", sortKey: "contactName" },
    phone: { label: "เบอร์โทร" },
    manager: { label: "คนดูแล" },
    ...Object.fromEntries(STAGE_COLS.map((sc) => [`s_${sc.key}`, { label: sc.label, className: "px-2 text-center" }])),
    brief: { label: "แบรนด์/บรีฟ" },
    history: { label: "ประวัติการคุยล่าสุด" },
    payment: { label: "สถานะ", sortKey: "paymentStatus" },
    package: { label: "แพ็คเกจ (รอบปัจจุบัน)" },
    paid: { label: "จ่ายแล้ว", sortKey: "paid", className: "text-right" },
    outstanding: { label: "ค้างชำระ", sortKey: "outstanding", className: "text-right" },
    docs: { label: "เอกสาร", className: "text-center" },
    link: { label: "ลิงก์ลูกค้า" },
    actions: { label: "" },
  };
  const DEFAULT_COLS = Object.keys(HEADS);
  const [colOrder, setColOrder] = useState<string[]>(DEFAULT_COLS);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("prompost:clients-columns") ?? "null") as string[] | null;
      if (Array.isArray(saved)) {
        // keep only known columns and append any new ones the saved list doesn't have
        const known = saved.filter((c) => DEFAULT_COLS.includes(c));
        setColOrder([...known, ...DEFAULT_COLS.filter((c) => !known.includes(c))]);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function saveOrder(next: string[]) {
    setColOrder(next);
    try {
      localStorage.setItem("prompost:clients-columns", JSON.stringify(next));
    } catch {}
  }
  function moveColumn(from: string, to: string) {
    if (!from || from === to || !colOrder.includes(from)) return;
    const next = colOrder.filter((c) => c !== from);
    next.splice(next.indexOf(to), 0, from);
    saveOrder(next);
  }
  function shiftColumn(id: string, dir: -1 | 1) {
    const i = colOrder.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= colOrder.length) return;
    const next = [...colOrder];
    [next[i], next[j]] = [next[j], next[i]];
    saveOrder(next);
  }

  const stageSums = useMemo(() => {
    const byClient: Record<string, { type: string }[]> = {};
    for (const t of taskStages) (byClient[t.clientId] ??= []).push(t);
    return Object.fromEntries(Object.entries(byClient).map(([id, list]) => [id, summarizeStages(list)]));
  }, [taskStages]);

  function exportClients() {
    downloadCsv(
      "ลูกค้า",
      ["ชื่อร้าน", "ผู้ติดต่อ", "เบอร์โทร", "คนดูแล", "สถานะ", "แพ็คเกจ (รอบปัจจุบัน)", "ยอดรอบปัจจุบัน", "จ่ายแล้ว", "ค้างชำระ", "ความสำคัญ", "ประวัติการคุยล่าสุด"],
      sortedClients.map((c) => {
        const round = currentRounds[c.id];
        return [
          c.name,
          c.contactName ?? "",
          c.phone ?? "",
          staff.find((s) => s.id === c.managerId)?.name ?? "",
          PAYMENT_LABEL[c.paymentStatus],
          round ? (packages.find((p) => p.id === round.packageId)?.name ?? "") : "",
          balances[c.id]?.billed ?? "",
          round ? (roundPaid[c.id] ?? 0) : "",
          round ? roundOutstanding(c.id) : "",
          c.priority || "",
          latestNotes[c.id]?.note ?? "",
        ];
      }),
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
          <div className="flex items-center gap-2">
          <button
            onClick={exportClients}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มลูกค้าใหม่
          </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
          <table className="w-full min-w-[1450px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                {colOrder.map((id) => {
                  const h = HEADS[id];
                  return (
                    <th
                      key={id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        moveColumn(e.dataTransfer.getData("text/plain"), id);
                      }}
                      className={cn("group/th select-none px-3 py-3 font-medium", h.className)}
                      title="ลากหัวตารางเพื่อสลับตำแหน่งคอลัมน์"
                    >
                      <span className="flex items-center gap-1">
                        <button type="button" onClick={() => shiftColumn(id, -1)} className="hidden text-gray-300 hover:text-gray-600 group-hover/th:inline" aria-label="เลื่อนไปซ้าย">
                          ◀
                        </button>
                        {h.sortKey ? (
                          <button onClick={() => handleSort(h.sortKey!)} className="flex items-center gap-1 hover:text-gray-600">
                            {h.label}
                            {sortBy === h.sortKey ? (
                              sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : (
                              <ChevronsUpDown size={12} className="opacity-40" />
                            )}
                          </button>
                        ) : (
                          <span>{h.label}</span>
                        )}
                        <button type="button" onClick={() => shiftColumn(id, 1)} className="hidden text-gray-300 hover:text-gray-600 group-hover/th:inline" aria-label="เลื่อนไปขวา">
                          ▶
                        </button>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedClients.map((client) => {
                const note = latestNotes[client.id];
                const round = currentRounds[client.id];
                const pkg = round ? packages.find((p) => p.id === round.packageId) : undefined;
                const paid = roundPaid[client.id] ?? 0;
                const outstanding = roundOutstanding(client.id);
                const sums = stageSums[client.id] ?? { total: 0, groups: [] };
                const cellNodes: Record<string, React.ReactNode> = {
                  priority: (
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={client.priority || ""}
                        placeholder="0"
                        onChange={(e) => handlePriorityChange(client, Number(e.target.value) || 0)}
                        className="w-12 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </td>
                  ),
                  name: (
                    <td className="px-3 py-3 font-medium text-gray-900">
                      <Link href={`/clients/${client.id}`} className="hover:text-brand-600 hover:underline">
                        {client.name}
                      </Link>
                    </td>
                  ),
                  contact: (
                    <td className="px-3 py-3 text-gray-600">{client.contactName || "—"}</td>
                  ),
                  phone: (
                    <td className="px-3 py-3">
                      <input
                        value={client.phone ?? ""}
                        onChange={(e) => setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, phone: e.target.value } : c)))}
                        onBlur={(e) => handlePhoneBlur(client, e.target.value)}
                        placeholder="—"
                        className="w-32 rounded-lg border border-transparent px-2 py-1 text-gray-600 hover:border-gray-200 focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </td>
                  ),
                  manager: (
                    <td className="px-3 py-3">
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
                  ),
                  brief: (
                    <td className="max-w-[220px] px-3 py-3">
                      <Link
                        href={`/clients/${client.id}/brand`}
                        className="line-clamp-2 text-xs text-gray-500 hover:text-brand-600"
                      >
                        {client.brandBrief ? client.brandBrief : <span className="italic text-gray-300">กดเพื่อเพิ่มบรีฟแบรนด์</span>}
                      </Link>
                    </td>
                  ),
                  history: (
                    <td className="max-w-[260px] px-3 py-3">
                      <button
                        onClick={() => setHistoryFor(client)}
                        className="flex w-full items-start gap-1.5 text-left text-xs text-gray-500 hover:text-brand-600"
                      >
                        {note ? <History size={13} className="mt-0.5 shrink-0" /> : <MessageSquarePlus size={13} className="mt-0.5 shrink-0" />}
                        <span className="line-clamp-2">{note ? `${stripNoteMarkup(note.note)}${note.images?.length ? ` 📷${note.images.length}` : ""}` : "ยังไม่มีประวัติ — กดเพื่อเพิ่ม"}</span>
                      </button>
                    </td>
                  ),
                  payment: (
                    <td className="px-3 py-3">
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
                  ),
                  package: (
                    <td className="max-w-[180px] px-3 py-3 text-xs">
                      <button
                        onClick={() => setPickPackageFor(client)}
                        className="flex items-center gap-1 text-gray-600 hover:text-brand-600"
                      >
                        <PackageIcon size={12} />
                        {pkg ? pkg.name : <span className="italic text-gray-300">เลือกแพ็คเกจ</span>}
                      </button>
                    </td>
                  ),
                  paid: (
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setPayFor(client)}
                        disabled={!round}
                        className={cn("font-medium hover:underline", round ? "text-gray-900" : "text-gray-300")}
                      >
                        {round ? `฿${currency(paid)}` : "—"}
                      </button>
                    </td>
                  ),
                  outstanding: (
                    <td className={cn("px-3 py-3 text-right font-medium", outstanding > 0 ? "text-rose-600" : "text-gray-400")}>
                      {round ? `฿${currency(outstanding)}` : "—"}
                    </td>
                  ),
                  docs: (
                    <td className="px-3 py-3 text-center">
                      <Link
                        href={`/clients/${client.id}/info`}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        <FileText size={12} />
                        {docCount[client.id] ?? 0}
                      </Link>
                    </td>
                  ),
                  link: (
                    <td className="px-3 py-3">
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
                  ),
                  actions: (
                    <td className="px-3 py-3">
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
                  ),
                  ...Object.fromEntries(
                    STAGE_COLS.map((sc) => {
                      const count = sc.key === "total" ? sums.total : (sums.groups.find((g) => g.key === sc.key)?.count ?? 0);
                      return [
                        `s_${sc.key}`,
                        <td key={sc.key} className="px-2 py-3 text-center">
                          {count > 0 ? (
                            <Link
                              href={sc.key === "total" ? `/clients/${client.id}` : `/clients/${client.id}?stage=${sc.key}`}
                              className={cn("inline-block min-w-8 rounded-full px-2 py-0.5 text-xs font-semibold", sc.tone)}
                            >
                              {count}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-300">0</span>
                          )}
                        </td>,
                      ];
                    }),
                  ),
                };
                return (
                  <tr key={client.id} className="align-top hover:bg-gray-50/60">
                    {colOrder.map((id) => (
                      <Fragment key={id}>{cellNodes[id]}</Fragment>
                    ))}
                  </tr>
                );
              })}
              {sortedClients.length === 0 && (
                <tr>
                  <td colSpan={colOrder.length} className="px-4 py-10 text-center text-sm text-gray-400">
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
