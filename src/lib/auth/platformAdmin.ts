import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccountId } from "@/lib/auth/accountServer";

// SERVER-ONLY. The platform owner (accounts.is_platform_admin) — sees and manages every workspace.
export async function isPlatformAdmin(accountId: string | null): Promise<boolean> {
  if (!accountId) return false;
  const { data } = await createAdminClient().from("accounts").select("is_platform_admin").eq("id", accountId).maybeSingle();
  return Boolean(data?.is_platform_admin);
}

export async function requirePlatformAdmin(request: NextRequest): Promise<string | NextResponse> {
  const acc = await currentAccountId(request);
  if (!(await isPlatformAdmin(acc))) return NextResponse.json({ error: "สำหรับผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  return acc!;
}
