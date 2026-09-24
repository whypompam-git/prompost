"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { FileText, Plus, Printer, Receipt as ReceiptIcon, ReceiptText, Search, Settings, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { QuotationModal, type QuotationFormValues } from "@/components/accounting/QuotationModal";
import { InvoiceModal, type InvoiceFormValues } from "@/components/accounting/InvoiceModal";
import { ReceiptModal, type ReceiptFormValues } from "@/components/accounting/ReceiptModal";
import { AgencySettingsModal } from "@/components/accounting/AgencySettingsModal";
import { calcQuotationTotals } from "@/lib/accounting";
import {
  createInvoiceRow,
  createQuotationRow,
  createReceiptRow,
  deleteInvoiceRow,
  deleteQuotationRow,
  deleteReceiptRow,
  getAgencySettings,
  listClients,
  listInvoices,
  listQuotations,
  listReceipts,
  saveAgencySettings,
  updateInvoiceStatus,
} from "@/lib/supabase/queries";
import type { AgencySettings, Client, Invoice, Quotation, QuotationStatus, Receipt } from "@/lib/types";
import { cn } from "@/lib/utils";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const PAGE_SIZE = 15;

type Tab = "quotation" | "invoice" | "receipt";
type Modal = "closed" | Tab | "agency";

const QUOTE_STATUS: Record<QuotationStatus, { label: string; style: string }> = {
  draft: { label: "ร่าง", style: "bg-gray-100 text-gray-600" },
  sent: { label: "ส่งแล้ว", style: "bg-sky-100 text-sky-700" },
  accepted: { label: "ลูกค้ายอมรับ", style: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ลูกค้าปฏิเสธ", style: "bg-rose-100 text-rose-700" },
};

type Row = {
  id: string;
  no: string;
  clientId: string;
  date: string;
  amount: number;
  status?: { key: string; label: string; style: string; onClick?: () => void };
  printHref: string;
  sharePath: string;
  feedback?: string;
  onDelete: () => void;
};

export default function DocumentsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [agency, setAgency] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>("closed");

  const [tab, setTab] = useState<Tab>("quotation");
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    Promise.all([listClients(), listQuotations(), listInvoices(), listReceipts(), getAgencySettings()])
      .then(([c, q, i, r, a]) => {
        setClients(c);
        setQuotations(q);
        setInvoices(i);
        setReceipts(r);
        setAgency(a);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setVisible(PAGE_SIZE);
    setStatusFilter("");
  }, [tab]);
  useEffect(() => setVisible(PAGE_SIZE), [query, clientFilter, statusFilter]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  async function confirmDelete<T extends { id: string }>(
    label: string,
    item: T,
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    remove: (id: string) => Promise<void>,
  ) {
    if (!window.confirm(`ลบ ${label} ใช่ไหม?`)) return;
    setList((prev) => prev.filter((x) => x.id !== item.id));
    try {
      await remove(item.id);
    } catch (err) {
      console.error(err);
      setList((prev) => [item, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  function toggleInvoicePaid(inv: Invoice) {
    const status = inv.status === "paid" ? "unpaid" : "paid";
    setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, status } : x)));
    updateInvoiceStatus(inv.id, status).catch(console.error);
  }

  const rows: Row[] = useMemo(() => {
    if (tab === "quotation") {
      return quotations.map((q) => ({
        id: q.id,
        no: q.quoteNo,
        clientId: q.clientId,
        date: q.createdAt,
        amount: calcQuotationTotals(q.items, q.vatPercent, q.whtPercent).total,
        status: { key: q.status, ...QUOTE_STATUS[q.status] },
        printHref: `/print/quotation/${q.id}`,
        sharePath: `/quote/${q.shareToken}`,
        feedback: q.clientFeedback,
        onDelete: () => confirmDelete(`ใบเสนอราคา ${q.quoteNo}`, q, setQuotations, deleteQuotationRow),
      }));
    }
    if (tab === "invoice") {
      return invoices.map((inv) => ({
        id: inv.id,
        no: inv.invoiceNo,
        clientId: inv.clientId,
        date: inv.createdAt,
        amount: calcQuotationTotals(inv.items, inv.vatPercent, inv.whtPercent).total,
        status: {
          key: inv.status,
          label: inv.status === "paid" ? "ชำระแล้ว" : "ค้างชำระ",
          style: inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
          onClick: () => toggleInvoicePaid(inv),
        },
        printHref: `/print/invoice/${inv.id}`,
        sharePath: `/invoice/${inv.shareToken}`,
        onDelete: () => confirmDelete(`ใบแจ้งหนี้ ${inv.invoiceNo}`, inv, setInvoices, deleteInvoiceRow),
      }));
    }
    return receipts.map((r) => ({
      id: r.id,
      no: r.receiptNo,
      clientId: r.clientId,
      date: r.createdAt,
      amount: r.amount,
      printHref: `/print/receipt/${r.id}`,
      sharePath: `/receipt/${r.shareToken}`,
      onDelete: () => confirmDelete(`ใบเสร็จ ${r.receiptNo}`, r, setReceipts, deleteReceiptRow),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, quotations, invoices, receipts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (clientFilter ? r.clientId === clientFilter : true))
      .filter((r) => (statusFilter ? r.status?.key === statusFilter : true))
      .filter((r) => (q ? r.no.toLowerCase().includes(q) || clientName(r.clientId).toLowerCase().includes(q) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, clientFilter, statusFilter, clients]);

  const shown = filtered.slice(0, visible);
  const total = filtered.reduce((s, r) => s + r.amount, 0);

  // group by month so long lists stay scannable
  const groups: { month: string; rows: Row[] }[] = [];
  for (const r of shown) {
    const month = format(new Date(r.date), "MMMM yyyy", { locale: th });
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.rows.push(r);
    else groups.push({ month, rows: [r] });
  }

  const statusOptions =
    tab === "quotation"
      ? Object.entries(QUOTE_STATUS).map(([k, v]) => ({ key: k, label: v.label }))
      : tab === "invoice"
        ? [
            { key: "unpaid", label: "ค้างชำระ" },
            { key: "paid", label: "ชำระแล้ว" },
          ]
        : [];

  const TABS: { key: Tab; label: string; icon: typeof FileText; count: number }[] = [
    { key: "quotation", label: "ใบเสนอราคา", icon: FileText, count: quotations.length },
    { key: "invoice", label: "ใบแจ้งหนี้", icon: ReceiptText, count: invoices.length },
    { key: "receipt", label: "ใบเสร็จ", icon: ReceiptIcon, count: receipts.length },
  ];
  const createLabel = { quotation: "สร้างใบเสนอราคา", invoice: "สร้างใบแจ้งหนี้", receipt: "ออกใบเสร็จ" }[tab];

  if (loading) {
    return (
      <>
        <Topbar title="เอกสาร" subtitle="ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="เอกสาร" subtitle="ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ" />
      <div className="flex-1 space-y-3 p-4 sm:space-y-4 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1 rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm",
                  tab === t.key ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                <t.icon size={14} className="hidden sm:block" />
                {t.label}
                <span className="rounded-full bg-gray-200/70 px-1.5 text-[10px] text-gray-600">{t.count}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setModal("agency")}
            className="shrink-0 rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50"
            aria-label="ข้อมูลผู้เสนอราคา"
            title="ข้อมูลผู้เสนอราคา (หัวเอกสาร)"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาเลขที่ / ชื่อลูกค้า"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="max-w-[160px] rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700"
          >
            <option value="">ทุกลูกค้า</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setModal(tab)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={15} />
            {createLabel}
          </button>
        </div>

        {statusOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[{ key: "", label: "ทั้งหมด" }, ...statusOptions].map((o) => (
              <button
                key={o.key}
                onClick={() => setStatusFilter(o.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  statusFilter === o.key
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          {filtered.length} ฉบับ · รวม ฿{currency(total)}
        </p>

        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.month}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{g.month}</h3>
              <div className="divide-y divide-gray-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                {g.rows.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{r.no}</p>
                        <p className="truncate text-xs text-gray-500">
                          {clientName(r.clientId)} · {format(new Date(r.date), "d MMM", { locale: th })}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-gray-900">฿{currency(r.amount)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {r.status ? (
                        <button
                          type="button"
                          onClick={r.status.onClick}
                          disabled={!r.status.onClick}
                          className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", r.status.style)}
                          title={r.status.onClick ? "กดเพื่อสลับสถานะ" : undefined}
                        >
                          {r.status.label}
                        </button>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-1">
                        <a
                          href={r.printHref}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label="เปิด/ดาวน์โหลด"
                        >
                          <Printer size={14} />
                        </a>
                        <CopyLinkButton path={r.sharePath} label="ลิงก์" />
                        <button
                          onClick={r.onDelete}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="ลบ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {r.feedback && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                        ลูกค้าแจ้ง: {r.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-2xl bg-white py-12 text-center text-sm text-gray-400">ไม่พบเอกสาร</p>
          )}
        </div>

        {filtered.length > visible && (
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            แสดงเพิ่ม ({filtered.length - visible} ฉบับที่เหลือ)
          </button>
        )}
      </div>

      {modal === "quotation" && (
        <QuotationModal
          clients={clients}
          onClose={() => setModal("closed")}
          onSave={async (v: QuotationFormValues) => {
            const created = await createQuotationRow(v);
            setQuotations((prev) => [created, ...prev]);
            setModal("closed");
          }}
        />
      )}
      {modal === "invoice" && (
        <InvoiceModal
          clients={clients}
          onClose={() => setModal("closed")}
          onSave={async (v: InvoiceFormValues) => {
            const created = await createInvoiceRow(v);
            setInvoices((prev) => [created, ...prev]);
            setModal("closed");
          }}
        />
      )}
      {modal === "receipt" && (
        <ReceiptModal
          clients={clients}
          invoices={invoices}
          onClose={() => setModal("closed")}
          onSave={async (v: ReceiptFormValues) => {
            const created = await createReceiptRow(v);
            setReceipts((prev) => [created, ...prev]);
            setInvoices(await listInvoices());
            setModal("closed");
          }}
        />
      )}
      {modal === "agency" && agency && (
        <AgencySettingsModal
          initial={agency}
          onClose={() => setModal("closed")}
          onSave={async (v) => {
            await saveAgencySettings(v);
            setAgency(v);
            setModal("closed");
          }}
        />
      )}
    </>
  );
}
