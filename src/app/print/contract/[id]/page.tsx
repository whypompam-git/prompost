import { notFound } from "next/navigation";
import { ContractDocument } from "@/components/contracts/ContractDocument";
import { ContractToolbar } from "@/components/contracts/ContractToolbar";
import { CONTRACT_COLUMNS, fromContractRow } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { signerInfo, viewerIsOwner, withViewableSignatures } from "@/lib/contractServer";

export const dynamic = "force-dynamic";

// Staff preview / PDF of any contract (login-checked by the middleware).
export default async function PrintContractPage({ params }: { params: { id: string } }) {
  const { data } = await createAdminClient().from("contracts").select(CONTRACT_COLUMNS).eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const owner = await viewerIsOwner();
  // staff contracts are owner-only
  if (data.kind && data.kind !== "client" && !owner) notFound();
  const contract = await withViewableSignatures(fromContractRow(data));
  const signer = owner && contract.kind !== "client" ? await signerInfo(contract.id) : undefined;
  return (
    <div className="min-h-screen bg-gray-100">
      <ContractToolbar
        backHref="/documents"
        fileName={`สัญญา ${contract.parties.client.name} ${contract.contractNo}`.replace(/[\\/:*?"<>|]/g, " ")}
      />
      <div className="py-6">
        <ContractDocument contract={contract} signer={signer} />
      </div>
    </div>
  );
}
