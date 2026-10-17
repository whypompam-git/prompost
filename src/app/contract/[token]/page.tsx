import { notFound } from "next/navigation";
import { ContractDocument } from "@/components/contracts/ContractDocument";
import { ContractSignForm } from "@/components/contracts/ContractSignForm";
import { ContractToolbar } from "@/components/contracts/ContractToolbar";
import { LinkRevoked } from "@/components/portal/LinkRevoked";
import { CONTRACT_COLUMNS, fromContractRow } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public, token-gated: the client reads the contract and signs it online.
export default async function ContractSharePage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("contracts").select(CONTRACT_COLUMNS).eq("share_token", params.token).maybeSingle();
  // drafts are not shared yet
  if (!data || data.status === "draft") notFound();
  const contract = fromContractRow(data);

  const { data: client } = await supabase.from("clients").select("portal_enabled").eq("id", contract.clientId).maybeSingle();
  if (client && client.portal_enabled === false) return <LinkRevoked />;

  return (
    <div className="min-h-screen bg-gray-100">
      <ContractToolbar fileName={`สัญญา ${contract.parties.client.name} ${contract.contractNo}`.replace(/[\\/:*?"<>|]/g, " ")} />
      <div className="py-6">
        <ContractDocument contract={contract} />
        {contract.status === "sent" && (
          <ContractSignForm shareToken={contract.shareToken} defaultName="" />
        )}
        {contract.status === "signed" && (
          <p className="mx-auto mt-4 w-[210mm] max-w-full px-4 text-center text-sm text-emerald-600">
            สัญญานี้ลงนามครบถ้วนแล้ว — ดาวน์โหลดเก็บไว้ได้ที่ปุ่มด้านบน
          </p>
        )}
      </div>
    </div>
  );
}
