import { notFound } from "next/navigation";
import { FileText, Package as PackageIcon, Phone, Receipt as ReceiptIcon } from "lucide-react";
import { APP_NAME } from "@/config/branding";
import { Card } from "@/components/ui/Card";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { calcQuotationTotals } from "@/lib/accounting";
import { createClient } from "@/lib/supabase/server";
import type { QuotationItem, QuotationStatus } from "@/lib/types";

const QUOTE_STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "ร่าง",
  sent: "ส่งแล้ว",
  accepted: "ยอมรับแล้ว",
  rejected: "ปฏิเสธ",
};

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

export default async function ClientPortalInfoPage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, contact_name, phone")
    .eq("portal_token", params.token)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: clientPackages }, { data: quotations }, { data: receipts }] = await Promise.all([
    supabase
      .from("client_packages")
      .select("id, assigned_at, packages(id, name, price)")
      .eq("client_id", client.id)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("quotations")
      .select("id, quote_no, items, vat_percent, wht_percent, status, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("receipts")
      .select("id, receipt_no, amount, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
  ]);

  type ClientPackageRow = {
    id: string;
    assigned_at: string;
    packages: { id: string; name: string; price: number }[] | { id: string; name: string; price: number } | null;
  };

  const packageOf = (cp: ClientPackageRow) => (Array.isArray(cp.packages) ? cp.packages[0] : cp.packages) ?? null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{APP_NAME}</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">ข้อมูลลูกค้า {client.name}</h1>
        </div>

        <PortalTabs token={params.token} active="info" />

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Phone size={15} />
            ข้อมูลติดต่อ
          </h2>
          <Card className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ชื่อร้าน/บริษัท</span>
              <span className="font-medium text-gray-800">{client.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ชื่อผู้ติดต่อ</span>
              <span className="font-medium text-gray-800">{client.contact_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">เบอร์โทร</span>
              <span className="font-medium text-gray-800">{client.phone || "—"}</span>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <PackageIcon size={15} />
            แพ็คเกจที่ซื้อ
          </h2>
          <Card className="space-y-2">
            {((clientPackages ?? []) as ClientPackageRow[]).map((cp) => {
              const pkg = packageOf(cp);
              return (
                <div key={cp.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pkg?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">เริ่มใช้ {dateLabel(cp.assigned_at)}</p>
                  </div>
                  {pkg && <p className="text-sm font-semibold text-gray-900">฿{currency(pkg.price)}</p>}
                </div>
              );
            })}
            {(!clientPackages || clientPackages.length === 0) && (
              <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีแพ็คเกจ</p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <FileText size={15} />
            ใบเสนอราคา
          </h2>
          <Card className="space-y-2">
            {(quotations ?? []).map((q) => {
              const totals = calcQuotationTotals(
                q.items as QuotationItem[],
                q.vat_percent,
                q.wht_percent,
              );
              return (
                <div key={q.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{q.quote_no}</p>
                    <p className="text-xs text-gray-400">{dateLabel(q.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">฿{currency(totals.total)}</p>
                    <p className="text-xs text-gray-400">{QUOTE_STATUS_LABEL[q.status as QuotationStatus]}</p>
                  </div>
                </div>
              );
            })}
            {(!quotations || quotations.length === 0) && (
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
            {(receipts ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.receipt_no}</p>
                  <p className="text-xs text-gray-400">{dateLabel(r.created_at)}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">฿{currency(r.amount)}</p>
              </div>
            ))}
            {(!receipts || receipts.length === 0) && (
              <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีใบเสร็จ</p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
