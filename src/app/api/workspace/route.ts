import { NextResponse, type NextRequest } from "next/server";
import { caller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceNameError } from "@/lib/workspaceRules";

export const dynamic = "force-dynamic";

// Owner: this workspace's name / Workspace ID / open-for-joining, and the people asking to join.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const db = createAdminClient();
  const [{ data: ws }, { data: reqs }] = await Promise.all([
    db.from("workspaces").select("name, handle, join_open, ai_enabled, line_enabled").eq("id", c.workspaceId).maybeSingle(),
    db.from("workspace_join_requests").select("id, created_at, accounts(username, display_name)").eq("workspace_id", c.workspaceId).eq("status", "pending").order("created_at"),
  ]);
  return NextResponse.json({
    name: ws?.name ?? "",
    handle: ws?.handle ?? "",
    joinOpen: Boolean(ws?.join_open),
    aiEnabled: Boolean(ws?.ai_enabled),
    lineEnabled: Boolean(ws?.line_enabled),
    requests: (reqs ?? []).map((r) => {
      const a = (Array.isArray(r.accounts) ? r.accounts[0] : r.accounts) as { username: string; display_name: string | null } | null;
      return { id: r.id, username: a?.username ?? "", displayName: a?.display_name ?? "", createdAt: r.created_at };
    }),
  });
}

export async function PATCH(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const err = workspaceNameError(body.name);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    patch.name = String(body.name).trim();
  }
  if (typeof body.joinOpen === "boolean") patch.join_open = body.joinOpen;
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });
  // the Workspace ID, AI and LINE switches are not changeable here
  const { error } = await createAdminClient().from("workspaces").update(patch).eq("id", c.workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
