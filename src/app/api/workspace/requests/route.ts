import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { NO_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const COLORS = ["bg-orange-500", "bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500", "bg-amber-500"];

// Owner approves (→ a staff row in this workspace, no special permissions yet) or declines a join request.
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const { id, action } = await request.json().catch(() => ({}));
  if (!isUuid(id) || !["approve", "reject"].includes(action)) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("workspace_join_requests")
    .select("id, account_id, status, accounts(username, display_name)")
    .eq("id", id)
    .eq("workspace_id", c.workspaceId) // only requests to the owner's own workspace
    .maybeSingle();
  if (!req || req.status !== "pending") return NextResponse.json({ error: "ไม่พบคำขอนี้ หรือจัดการไปแล้ว" }, { status: 404 });

  let staffId: string | null = null;
  if (action === "approve") {
    const a = (Array.isArray(req.accounts) ? req.accounts[0] : req.accounts) as { username: string; display_name: string | null } | null;
    const db = workspaceDb(c.workspaceId);
    const { data: existing } = await db.from("staff").select("id, is_active").eq("account_id", req.account_id).maybeSingle();
    if (existing) {
      if (!existing.is_active) await db.from("staff").update({ is_active: true }).eq("id", existing.id);
      staffId = existing.id;
    } else {
      const { data: staff, error } = await db
        .from("staff")
        .insert({
          name: a?.display_name || a?.username || "สมาชิกใหม่",
          position: "พนักงาน",
          role: "staff",
          account_id: req.account_id,
          permissions: NO_PERMISSIONS,
          avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)],
          base_salary: 0,
        })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      staffId = staff.id;
    }
  }
  await admin
    .from("workspace_join_requests")
    .update({ status: action === "approve" ? "approved" : "rejected", decided_at: new Date().toISOString(), decided_by: c.staffId })
    .eq("id", req.id);
  return NextResponse.json({ ok: true, staffId });
}
