import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCOUNT_COOKIE, SESSION_COOKIE, cookieOptions, signAccount, signSession, verifyAccount, verifySession } from "@/lib/auth/session";

// SERVER-ONLY helpers for accounts (logins) and memberships (staff rows, one per workspace).

export type Membership = {
  staffId: string;
  name: string;
  role: "owner" | "staff";
  workspaceId: string;
  workspaceName: string;
  handle: string;
};

// The account behind this request: the account cookie, or (older sessions from before
// the cookie existed) the account linked to the staff session.
export async function currentAccountId(request: NextRequest): Promise<string | null> {
  const fromCookie = await verifyAccount(request.cookies.get(ACCOUNT_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  const claims = await verifySession(request.cookies.get(SESSION_COOKIE)?.value ?? "");
  if (!claims) return null;
  const { data } = await createAdminClient().from("staff").select("account_id").eq("id", claims.staffId).maybeSingle();
  return (data?.account_id as string | null) ?? null;
}

export async function memberships(accountId: string): Promise<Membership[]> {
  const { data } = await createAdminClient()
    .from("staff")
    .select("id, name, role, workspace_id, created_at, workspaces(name, handle)")
    .eq("account_id", accountId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => {
    const w = (Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces) as { name: string; handle: string } | null;
    return { staffId: r.id, name: r.name, role: r.role, workspaceId: r.workspace_id, workspaceName: w?.name ?? "", handle: w?.handle ?? "" };
  });
}

// Log into one workspace (as that staff row) and remember the account.
export async function setSessions(res: NextResponse, accountId: string, staff?: { id: string; name: string; role: "owner" | "staff" }) {
  res.cookies.set(ACCOUNT_COOKIE, await signAccount(accountId), cookieOptions);
  if (staff) res.cookies.set(SESSION_COOKIE, await signSession({ staffId: staff.id, name: staff.name, role: staff.role }), cookieOptions);
  else res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function requireAccount(request: NextRequest): Promise<string | NextResponse> {
  const id = await currentAccountId(request);
  return id ?? NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
}
