import { cookies } from "next/headers";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Contract } from "@/lib/types";

// Server-only helpers for contracts.

export const PRIVATE_PREFIX = "private:"; // "private:<path in the contracts bucket>"

// signatures of new signings live in the private "contracts" bucket — turn them into short-lived links
export async function withViewableSignatures(c: Contract): Promise<Contract> {
  const url = c.clientSignatureUrl;
  if (!url?.startsWith(PRIVATE_PREFIX)) return c;
  const { data } = await createAdminClient().storage.from("contracts").createSignedUrl(url.slice(PRIVATE_PREFIX.length), 60 * 60);
  return { ...c, clientSignatureUrl: data?.signedUrl };
}

// staff contracts (and the signer's ID card / address) are for the owner only
export async function viewerIsOwner(): Promise<boolean> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  const live = claims ? await fetchLiveAccess(claims.staffId) : null;
  return !!live && live.active && live.role === "owner";
}

export async function signerInfo(contractId: string): Promise<{ idNo?: string; address?: string } | undefined> {
  const { data } = await createAdminClient().from("contract_signer_info").select("id_no, address").eq("contract_id", contractId).maybeSingle();
  return data ? { idNo: data.id_no ?? undefined, address: data.address ?? undefined } : undefined;
}
