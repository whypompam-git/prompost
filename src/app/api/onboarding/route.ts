import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberships, requireAccount } from "@/lib/auth/accountServer";

export const dynamic = "force-dynamic";

// /welcome: who is logged in, their workspaces, and their join requests.
export async function GET(request: NextRequest) {
  const acc = await requireAccount(request);
  if (acc instanceof NextResponse) return acc;
  const db = createAdminClient();
  const [{ data: account }, ws, { data: reqs }] = await Promise.all([
    db.from("accounts").select("username, display_name").eq("id", acc).maybeSingle(),
    memberships(acc),
    db.from("workspace_join_requests").select("id, status, created_at, workspaces(name, handle)").eq("account_id", acc).order("created_at", { ascending: false }).limit(10),
  ]);
  return NextResponse.json({
    username: account?.username ?? "",
    displayName: account?.display_name ?? "",
    workspaces: ws.map(({ workspaceId, workspaceName, handle, role }) => ({ workspaceId, workspaceName, handle, role })),
    requests: (reqs ?? []).map((r) => {
      const w = (Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces) as { name: string; handle: string } | null;
      return { id: r.id, status: r.status, workspaceName: w?.name ?? "", handle: w?.handle ?? "", createdAt: r.created_at };
    }),
  });
}
