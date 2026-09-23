import { notFound } from "next/navigation";
import { BillingDocument } from "@/components/billing/BillingDocument";
import { PrintToolbar } from "@/components/billing/PrintToolbar";
import { createClient } from "@/lib/supabase/server";

export default async function PrintReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select("receipt_no, amount, created_at, notes, client_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!receipt) notFound();

  const [{ data: client }, { data: agency }] = await Promise.all([
    supabase.from("clients").select("name, phone, address, tax_id, entity_type").eq("id", receipt.client_id).maybeSingle(),
    supabase.from("agency_settings").select("name, address, phone, tax_id, bank_info").eq("id", true).maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref="/accounting" />
      <div className="py-8">
        <BillingDocument
          docType="receipt"
          docNo={receipt.receipt_no}
          date={receipt.created_at}
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
          items={[{ description: "ชำระค่าบริการ", qty: 1, unitPrice: receipt.amount }]}
          vatPercent={0}
          whtPercent={0}
          notes={receipt.notes ?? undefined}
        />
      </div>
    </div>
  );
}
