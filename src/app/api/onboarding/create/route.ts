import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { requireAccount, setSessions } from "@/lib/auth/accountServer";
import { handleError, normalizeHandle, workspaceNameError } from "@/lib/workspaceRules";

export const dynamic = "force-dynamic";

// Create Workspace: name + Workspace ID → the creator becomes its owner and is logged into it.
// AI and LINE start switched off (they run on the platform owner's paid accounts).
export async function POST(request: NextRequest) {
  const acc = await requireAccount(request);
  if (acc instanceof NextResponse) return acc;
  const body = await request.json().catch(() => ({}));
  const handle = normalizeHandle(body.handle);
  const err = workspaceNameError(body.name) ?? handleError(handle);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const name = String(body.name).trim();

  const admin = createAdminClient();
  const { data: account } = await admin.from("accounts").select("username, display_name").eq("id", acc).maybeSingle();
  if (!account) return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 401 });
  // a person may own a few workspaces, not a farm of them
  const { count } = await admin.from("workspaces").select("id", { count: "exact", head: true }).eq("created_by", acc);
  if ((count ?? 0) >= 3) return NextResponse.json({ error: "สร้าง Workspace ได้สูงสุด 3 อันต่อบัญชี" }, { status: 400 });

  const { data: ws, error } = await admin.from("workspaces").insert({ name, handle, created_by: acc }).select("id").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Workspace ID นี้มีคนใช้แล้ว" : error.message }, { status: 400 });

  const db = workspaceDb(ws.id);
  const { data: staff, error: sErr } = await db
    .from("staff")
    .insert({ name: account.display_name || account.username, position: "เจ้าของ", role: "owner", account_id: acc, avatar_color: "bg-orange-500", base_salary: 0 })
    .select("id, name, role")
    .single();
  if (sErr || !staff) {
    await admin.from("workspaces").delete().eq("id", ws.id);
    return NextResponse.json({ error: sErr?.message ?? "สร้างไม่สำเร็จ" }, { status: 500 });
  }
  await db.from("agency_settings").insert({ id: true, name });

  const res = NextResponse.json({ ok: true });
  await setSessions(res, acc, { id: staff.id, name: staff.name, role: staff.role });
  return res;
}
