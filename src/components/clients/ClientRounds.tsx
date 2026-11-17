"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { FileText, Paperclip, Plus, Printer, Receipt as ReceiptIcon, ScrollText, Trash2, Upload, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { QuotationModal, type QuotationFormValues } from "@/components/accounting/QuotationModal";
import { InvoiceModal, type InvoiceFormValues } from "@/components/accounting/InvoiceModal";
import { ReceiptModal, type ReceiptFormValues } from "@/components/accounting/ReceiptModal";
import { calcQuotationTotals } from "@/lib/accounting";
import { effectivePayments, roundBalance, suggestedInvoiceItems, suggestedQuoteItems, type Round } from "@/lib/billing";
import {
  addRoundFile,
  assignPackageToClient,
  createInvoiceRow,
  createQuotationRow,
  createReceiptRow,
  deleteInvoiceRow,
  deleteQuotationRow,
  deleteReceiptRow,
  deleteRoundFile,
  listClientPackages,
  listInvoices,
  listPackages,
  listQuotations,
  listReceipts,
  listRoundFiles,
  listTransactions,
  unassignClientPackage,
  updateInvoiceStatus,
  updateQuotationStatus,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import type { Client, ClientPackage, Invoice, Package, Quotation, QuotationStatus, Receipt, RoundFile, Transaction } from "@/lib/types";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const dateLabel = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: th });
const QUOTE_STATUS: Record<QuotationStatus, string> = { draft: "ร่าง", sent: "ส่งแล้ว", accepted: "ลูกค้าตอบรับ", rejected: "ปฏิเสธ" };
const iconBtn = "rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600";

type Modal = { kind: "quote" | "invoice" | "receipt"; roundId: string } | null;

// One card per package purchase (a billing "round"). Every document of that purchase —
// quotation, invoice, receipt and the files the client sent — lives under its card. Nothing
// is created automatically: the team presses the button for the document they need.
export function ClientRounds({ client, onChanged }: { client: Client; onChanged?: () => void }) {
  const [rounds, setRounds] = useState<ClientPackage[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [files, setFiles] = useState<RoundFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    const [cp, pk, q, inv, rc, tx, fl] = await Promise.all([
      listClientPackages(),
      listPackages(),
      listQuotations(),
      listInvoices(),
      listReceipts(),
      listTransactions().catch(() => [] as Transaction[]),
      listRoundFiles(client.id).catch(() => [] as RoundFile[]),
    ]);
    setRounds(cp.filter((r) => r.clientId === client.id).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)));
    setPackages(pk);
    setQuotes(q.filter((x) => x.clientId === client.id));
    setInvoices(inv.filter((x) => x.clientId === client.id));
    setReceipts(rc.filter((x) => x.clientId === client.id));
    setTxs(tx.filter((x) => x.clientId === client.id));
    setFiles(fl);
  }, [client.id]);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  const roundList: Round[] = rounds.map((r) => ({ id: r.id, clientId: r.clientId, packageName: packages.find((p) => p.id === r.packageId)?.name, amount: r.amount, assignedAt: r.assignedAt }));
  const quoteLite = quotes.map((q) => ({ id: q.id, clientId: q.clientId, clientPackageId: q.clientPackageId, status: q.status, createdAt: q.createdAt, items: q.items, vatPercent: q.vatPercent, whtPercent: q.whtPercent }));
  const payments = effectivePayments(roundList, receipts.map((r) => ({ id: r.id, clientId: r.clientId, clientPackageId: r.clientPackageId, amount: r.amount, createdAt: r.createdAt })), txs);

  const run = async (fn: () => Promise<unknown>, failMsg: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      window.alert(`${failMsg}${err instanceof Error && err.message ? `: ${err.message}` : ""}`);
    } finally {
      setBusy(false);
    }
  };

  const addPackage = (pkg: Package) => {
    if (!window.confirm(`เพิ่มแพ็คเกจ "${pkg.name}" ให้ ${client.name}?`)) return;
    return run(() => assignPackageToClient(client.id, pkg.id), "เพิ่มแพ็คเกจไม่สำเร็จ");
  };
  const removeRound = (r: ClientPackage, docCount: number) => {
    const msg = docCount > 0 ? `เอาแพ็คเกจนี้ออก? เอกสาร ${docCount} รายการจะยังอยู่ แต่ไม่ผูกกับแพ็คเกจ (ไฟล์แนบจะถูกลบ)` : "เอาแพ็คเกจนี้ออกจากลูกค้า?";
    if (!window.confirm(msg)) return;
    return run(async () => {
      for (const f of files.filter((x) => x.clientPackageId === r.id)) await deleteRoundFile(f.id);
      await unassignClientPackage(r.id);
    }, "เอาแพ็คเกจออกไม่สำเร็จ");
  };
  const confirmDelete = (label: string, fn: () => Promise<void>) => {
    if (!window.confirm(`ลบ${label}? ลบแล้วกู้คืนไม่ได้`)) return;
    return run(fn, "ลบไม่สำเร็จ");
  };
  const moveDoc = (table: "quotations" | "invoices" | "receipts", id: string, roundId: string) =>
    run(async () => {
      const { error } = await createClient().from(table).update({ client_package_id: roundId || null }).eq("id", id);
      if (error) throw error;
    }, "ย้ายเอกสารไม่สำเร็จ");

  async function pickFile(roundId: string, file: File | undefined) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return window.alert("ไฟล์ใหญ่เกิน 25 MB");
    await run(() => addRoundFile(client.id, roundId, file), "อัปโหลดไม่สำเร็จ");
  }

  if (loading) return <p className="py-6 text-center text-sm text-gray-400">กำลังโหลดแพ็คเกจ...</p>;

  const looseQuotes = quotes.filter((q) => !q.clientPackageId || !rounds.some((r) => r.id === q.clientPackageId));
  const looseInvoices = invoices.filter((x) => !x.clientPackageId || !rounds.some((r) => r.id === x.clientPackageId));
  const looseReceipts = receipts.filter((x) => !x.clientPackageId || !rounds.some((r) => r.id === x.clientPackageId));
  const loose = looseQuotes.length + looseInvoices.length + looseReceipts.length;

  const modalRound = modal ? roundList.find((r) => r.id === modal.roundId) : undefined;
  const modalBalance = modalRound ? roundBalance(modalRound, quoteLite, payments) : undefined;

  const quoteRow = (q: Quotation, roundId: string) => (
    <Row key={q.id} icon={<FileText size={15} />} title={`ใบเสนอราคา ${q.quoteNo}`} sub={dateLabel(q.createdAt)} amount={calcQuotationTotals(q.items, q.vatPercent, q.whtPercent).total}
      extra={
        <select value={q.status} disabled={busy} onChange={(e) => run(() => updateQuotationStatus(q.id, e.target.value as QuotationStatus), "เปลี่ยนสถานะไม่สำเร็จ")} className="rounded-md border border-gray-200 px-1.5 py-1 text-xs text-gray-600">
          {(Object.keys(QUOTE_STATUS) as QuotationStatus[]).map((s) => <option key={s} value={s}>{QUOTE_STATUS[s]}</option>)}
        </select>
      }
      print={q.fileUrl ?? `/print/quotation/${q.id}`} link={q.fileUrl ? undefined : `/quote/${q.shareToken}`}
      feedback={q.clientFeedback}
      move={looseMove(roundId, (to) => moveDoc("quotations", q.id, to))}
      onDelete={() => confirmDelete(`ใบเสนอราคา ${q.quoteNo}`, () => deleteQuotationRow(q.id))} />
  );
  const invoiceRow = (x: Invoice, roundId: string) => (
    <Row key={x.id} icon={<ScrollText size={15} />} title={`ใบแจ้งหนี้ ${x.invoiceNo}`} sub={`${dateLabel(x.createdAt)}${x.dueDate ? ` · ครบกำหนด ${dateLabel(x.dueDate)}` : ""}`} amount={calcQuotationTotals(x.items, x.vatPercent, x.whtPercent).total}
      extra={
        <button disabled={busy} onClick={() => run(() => updateInvoiceStatus(x.id, x.status === "paid" ? "unpaid" : "paid"), "เปลี่ยนสถานะไม่สำเร็จ")}
          className={`rounded-full px-2 py-0.5 text-xs ${x.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {x.status === "paid" ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
        </button>
      }
      print={`/print/invoice/${x.id}`} link={`/invoice/${x.shareToken}`}
      move={looseMove(roundId, (to) => moveDoc("invoices", x.id, to))}
      onDelete={() => confirmDelete(`ใบแจ้งหนี้ ${x.invoiceNo}`, () => deleteInvoiceRow(x.id))} />
  );
  const receiptRow = (x: Receipt, roundId: string) => (
    <Row key={x.id} icon={<ReceiptIcon size={15} />} title={`ใบเสร็จ ${x.receiptNo}`} sub={`${dateLabel(x.createdAt)}${x.description ? ` · ${x.description}` : ""}`} amount={x.amount}
      print={`/print/receipt/${x.id}`} link={`/receipt/${x.shareToken}`}
      move={looseMove(roundId, (to) => moveDoc("receipts", x.id, to))}
      onDelete={() => confirmDelete(`ใบเสร็จ ${x.receiptNo} (รายรับในบัญชีที่ผูกกับใบนี้จะถูกลบด้วย)`, () => deleteReceiptRow(x.id))} />
  );
  // legacy documents with no round get a picker to file them under one
  const looseMove = (roundId: string, fn: (to: string) => void) =>
    roundId ? undefined : (
      <select defaultValue="" disabled={busy} onChange={(e) => e.target.value && fn(e.target.value)} className="rounded-md border border-gray-200 px-1.5 py-1 text-xs text-gray-600">
        <option value="">ย้ายเข้าแพ็คเกจ…</option>
        {roundList.map((r) => <option key={r.id} value={r.id}>{r.packageName ?? "แพ็คเกจ"} · {dateLabel(r.assignedAt)}</option>)}
      </select>
    );

  return (
    <div className="space-y-3">
      {rounds.map((r) => {
        const round = roundList.find((x) => x.id === r.id)!;
        const bal = roundBalance(round, quoteLite, payments);
        const rq = quotes.filter((q) => q.clientPackageId === r.id);
        const ri = invoices.filter((x) => x.clientPackageId === r.id);
        const rr = receipts.filter((x) => x.clientPackageId === r.id);
        const rf = files.filter((f) => f.clientPackageId === r.id);
        const pkg = packages.find((p) => p.id === r.packageId);
        const count = rq.length + ri.length + rr.length + rf.length;
        return (
          <Card key={r.id} className="overflow-hidden !p-0">
            <div className="flex items-start justify-between gap-3 bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{pkg?.name ?? "แพ็คเกจ"}{pkg && pkg.clipCount > 0 ? <span className="font-normal text-gray-500"> · {pkg.clipCount} คลิป</span> : null}</p>
                <p className="text-xs text-gray-400">ซื้อเมื่อ {dateLabel(r.assignedAt)} · ราคาแพ็คเกจ ฿{currency(r.amount)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${bal.outstanding > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {bal.outstanding > 0 ? `ค้าง ฿${currency(bal.outstanding)}` : "ชำระครบ"}
                </span>
                <button onClick={() => removeRound(r, count)} disabled={busy} className="rounded-full p-1 text-gray-300 hover:bg-rose-50 hover:text-rose-500" aria-label="เอาแพ็คเกจออก"><X size={14} /></button>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {rq.map((q) => quoteRow(q, r.id))}
              {ri.map((x) => invoiceRow(x, r.id))}
              {rr.map((x) => receiptRow(x, r.id))}
              {rf.map((f) => (
                <Row key={f.id} icon={<Paperclip size={15} />} title={f.name} sub={`ไฟล์ที่ลูกค้าส่งมา · ${dateLabel(f.createdAt)}${f.sizeBytes ? ` · ${Math.max(1, Math.round(f.sizeBytes / 1024))} KB` : ""}`} open={`/api/round-files?id=${f.id}`}
                  onDelete={() => confirmDelete(`ไฟล์ ${f.name}`, () => deleteRoundFile(f.id))} />
              ))}
              {count === 0 && <p className="px-4 py-4 text-center text-xs text-gray-400">ยังไม่มีเอกสารในแพ็คเกจนี้ กดปุ่มด้านล่างเพื่อสร้าง</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
              <AddBtn onClick={() => setModal({ kind: "quote", roundId: r.id })} disabled={busy}>ใบเสนอราคา</AddBtn>
              <AddBtn onClick={() => setModal({ kind: "invoice", roundId: r.id })} disabled={busy}>ใบแจ้งหนี้</AddBtn>
              <AddBtn onClick={() => setModal({ kind: "receipt", roundId: r.id })} disabled={busy}>ใบเสร็จ</AddBtn>
              <UploadBtn disabled={busy} onPick={(f) => pickFile(r.id, f)} />
              <span className="ml-auto text-xs text-gray-400">เรียกเก็บ ฿{currency(bal.billed)} · รับแล้ว ฿{currency(bal.paid)}</span>
            </div>
          </Card>
        );
      })}
      {rounds.length === 0 && <p className="rounded-2xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">ยังไม่มีแพ็คเกจ — เลือกด้านล่างเพื่อเริ่มรอบการซื้อ</p>}

      {packages.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-medium text-gray-500">เพิ่มแพ็คเกจ (เริ่มรอบการซื้อใหม่)</p>
          <div className="flex flex-wrap gap-2">
            {packages.map((p) => (
              <button key={p.id} disabled={busy} onClick={() => addPackage(p)} className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50">
                <Plus size={12} />{p.name}{p.clipCount > 0 && <span className="opacity-70">· {p.clipCount} คลิป</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {loose > 0 && (
        <Card className="overflow-hidden !p-0">
          <div className="bg-gray-50 px-4 py-3"><p className="text-sm font-semibold text-gray-700">เอกสารที่ยังไม่อยู่ในแพ็คเกจ</p><p className="text-xs text-gray-400">เอกสารเก่าหรือที่ออกจากหน้าอื่น — ย้ายเข้าแพ็คเกจที่ถูกต้องได้</p></div>
          <div className="divide-y divide-gray-50">
            {looseQuotes.map((q) => quoteRow(q, ""))}
            {looseInvoices.map((x) => invoiceRow(x, ""))}
            {looseReceipts.map((x) => receiptRow(x, ""))}
          </div>
        </Card>
      )}

      {modal?.kind === "quote" && modalRound && (
        <QuotationModal
          clients={[client]}
          prefill={{ clientId: client.id }}
          suggest={() => ({ items: suggestedQuoteItems(modalRound), clientPackageId: modalRound.id })}
          onClose={() => setModal(null)}
          onSave={(v: QuotationFormValues) => { setModal(null); void run(() => createQuotationRow({ ...v, clientPackageId: modalRound.id }), "ออกใบเสนอราคาไม่สำเร็จ"); }}
        />
      )}
      {modal?.kind === "invoice" && modalRound && modalBalance && (
        <InvoiceModal
          clients={[client]}
          prefill={{ clientId: client.id, items: suggestedInvoiceItems(modalRound, modalBalance.outstanding, modalBalance.paid), notes: `ยอดแพ็คเกจ ฿${currency(modalBalance.billed)} · ชำระแล้ว ฿${currency(modalBalance.paid)}` }}
          onClose={() => setModal(null)}
          onSave={(v: InvoiceFormValues) => { setModal(null); void run(() => createInvoiceRow({ ...v, clientPackageId: modalRound.id }), "ออกใบแจ้งหนี้ไม่สำเร็จ"); }}
        />
      )}
      {modal?.kind === "receipt" && modalRound && (
        <ReceiptModal
          clients={[client]}
          invoices={invoices.filter((x) => x.clientPackageId === modalRound.id)}
          onClose={() => setModal(null)}
          onSave={(v: ReceiptFormValues) => { setModal(null); void run(() => createReceiptRow({ ...v, issuedAt: v.issuedAt, clientPackageId: modalRound.id }), "ออกใบเสร็จไม่สำเร็จ"); }}
        />
      )}
    </div>
  );
}

function AddBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50">
      <Plus size={12} />{children}
    </button>
  );
}

function UploadBtn({ onPick, disabled }: { onPick: (f: File | undefined) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className={`flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <Upload size={12} />อัปโหลดไฟล์
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => { onPick(e.target.files?.[0]); if (ref.current) ref.current.value = ""; }} />
    </label>
  );
}

function Row({ icon, title, sub, amount, extra, print, link, open, feedback, move, onDelete }: {
  icon: React.ReactNode; title: string; sub: string; amount?: number; extra?: React.ReactNode; print?: string; link?: string; open?: string; feedback?: string; move?: React.ReactNode; onDelete: () => void;
}) {
  return (
    <div className="px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-gray-400">{icon}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-800">{title}</p><p className="truncate text-xs text-gray-400">{sub}</p></div>
        {extra}{move}
        {amount !== undefined && <p className="text-sm font-semibold tabular-nums text-gray-900">฿{currency(amount)}</p>}
        <div className="flex items-center">
          {print && <a href={print} target="_blank" rel="noreferrer" className={iconBtn} aria-label="พิมพ์/เปิด"><Printer size={14} /></a>}
          {open && <a href={open} target="_blank" rel="noreferrer" className={iconBtn} aria-label="เปิดไฟล์"><Paperclip size={14} /></a>}
          {link && <CopyLinkButton path={link} label="ลิงก์" />}
          <button onClick={onDelete} className="rounded-full p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-500" aria-label="ลบ"><Trash2 size={14} /></button>
        </div>
      </div>
      {feedback && <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">ลูกค้าขอแก้: {feedback}</p>}
    </div>
  );
}
