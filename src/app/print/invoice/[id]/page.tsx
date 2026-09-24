import { notFound } from "next/navigation";
import { BillingDocument } from "@/components/billing/BillingDocument";
import { PrintToolbar } from "@/components/billing/PrintToolbar";
import { createClient } from "@/lib/supabase/server";
import type { QuotationItem } from "@/lib/types";

export default async function PrintInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_no, items, vat_percent, wht_percent, created_at, due_date, payment_note, notes, client_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!invoice) notFound();

  const [{ data: client }, { data: agency }] = await Promise.all([
    supabase.from("clients").select("name, phone, address, tax_id, entity_type").eq("id", invoice.client_id).maybeSingle(),
    supabase.from("agency_settings").select("name, address, phone, tax_id, bank_info").eq("id", true).maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref="/accounting" fileName={invoice.invoice_no} />
      <div className="py-8">
        <BillingDocument
          docType="invoice"
          docNo={invoice.invoice_no}
          date={invoice.created_at}
          dueDate={invoice.due_date ?? undefined}
          seller={{
            name: agency?.name ?? "",
            address: agency?.address ?? "",
            phone: agency?.phone ?? "",
            taxId: agency?.tax_id ?? "",
            bankInfo: agency?.bank_info ?? "",
          }}
          buyer={{
            name: client?.name ?? "—",
            phone: client?.phone ?? undefined,
            address: client?.address ?? undefined,
            taxId: client?.tax_id ?? undefined,
            entityType: client?.entity_type ?? undefined,
          }}
          items={invoice.items as QuotationItem[]}
          vatPercent={invoice.vat_percent}
          whtPercent={invoice.wht_percent}
          paymentNote={invoice.payment_note ?? undefined}
          notes={invoice.notes ?? undefined}
        />
      </div>
    </div>
  );
}
