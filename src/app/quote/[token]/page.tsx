import { notFound } from "next/navigation";
import { BillingDocument } from "@/components/billing/BillingDocument";
import { QuotationFeedbackForm } from "@/components/billing/QuotationFeedbackForm";
import { createClient } from "@/lib/supabase/server";
import type { QuotationItem } from "@/lib/types";

// Public, unguessable-token link — a client can view their quotation and
// leave a request-changes message, no login. Same open-RLS-for-now pattern
// as the customer portal (src/app/portal/[token]/page.tsx).
export default async function QuoteSharePage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select(
      "quote_no, items, vat_percent, wht_percent, created_at, valid_until, payment_note, notes, client_feedback, client_id, share_token",
    )
    .eq("share_token", params.token)
    .maybeSingle();
  if (!quotation) notFound();

  const [{ data: client }, { data: agency }] = await Promise.all([
    supabase.from("clients").select("name, phone, address, tax_id").eq("id", quotation.client_id).maybeSingle(),
    supabase.from("agency_settings").select("name, address, phone, tax_id, bank_info").eq("id", true).maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <BillingDocument
        docType="quotation"
        docNo={quotation.quote_no}
        date={quotation.created_at}
        validUntil={quotation.valid_until ?? undefined}
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
        }}
        items={quotation.items as QuotationItem[]}
        vatPercent={quotation.vat_percent}
        whtPercent={quotation.wht_percent}
        paymentNote={quotation.payment_note ?? undefined}
        notes={quotation.notes ?? undefined}
      />
      <QuotationFeedbackForm shareToken={quotation.share_token} initialFeedback={quotation.client_feedback ?? undefined} />
    </div>
  );
}
