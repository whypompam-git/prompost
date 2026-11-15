import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/auth/platformAdmin";

export const dynamic = "force-dynamic";

// Platform overview: every workspace (with size and switches) and every account.
export async function GET(request: NextRequest) {
  const me = await requirePlatformAdmin(request);
  if (me instanceof NextResponse) return me;
  const db = createAdminClient();
  const [{ data: workspaces }, { data: accounts }, { data: staff }, { data: pending }] = await Promise.all([
    db.from("workspaces").select("id, name, handle, ai_enabled, line_enabled, join_open, created_at").order("created_at"),
    db.from("accounts").select("id, username, display_name, is_platform_admin, created_at").order("created_at", { ascending: false }),
    db.from("staff").select("workspace_id, account_id, role, is_active"),
    db.from("workspace_join_requests").select("workspace_id").eq("status", "pending"),
  ]);
  const count = async (table: string, ws: string) => (await db.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", ws)).count ?? 0;
  const wsList = await Promise.all(
    (workspaces ?? []).map(async (w) => {
      const members = (staff ?? []).filter((s) => s.workspace_id === w.id && s.is_active);
      const ownerIds = members.filter((s) => s.role === "owner").map((s) => s.account_id);
      return {
        id: w.id,
        name: w.name,
        handle: w.handle,
        aiEnabled: w.ai_enabled,
        lineEnabled: w.line_enabled,
        joinOpen: w.join_open,
        createdAt: w.created_at,
        owners: (accounts ?? []).filter((a) => ownerIds.includes(a.id)).map((a) => a.username),
        members: members.length,
        clients: await count("clients", w.id),
        tasks: await count("tasks", w.id),
        pending: (pending ?? []).filter((p) => p.workspace_id === w.id).length,
      };
    }),
  );
  const nameOf = new Map((workspaces ?? []).map((w) => [w.id, w.handle]));
  return NextResponse.json({
    me,
    workspaces: wsList,
    accounts: (accounts ?? []).map((a) => ({
      id: a.id,
      username: a.username,
      displayName: a.display_name ?? "",
      isPlatformAdmin: a.is_platform_admin,
      createdAt: a.created_at,
      workspaces: (staff ?? []).filter((s) => s.account_id === a.id && s.is_active).map((s) => nameOf.get(s.workspace_id) ?? "?"),
    })),
  });
}
