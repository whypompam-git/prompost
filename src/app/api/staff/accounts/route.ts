import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { isUuid } from "@/lib/aiApi";
import { caller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUsername, passwordError, usernameError } from "@/lib/accountRules";

export const dynamic = "force-dynamic";

// Owner: see everyone's username, set a username / reset a password for a staff member.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const { data, error } = await createAdminClient().from("staff").select("id, accounts(username, password_hash)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map((s) => {
      const a = (Array.isArray(s.accounts) ? s.accounts[0] : s.accounts) as { username: string; password_hash: string | null } | null;
      return { staffId: s.id, username: a?.username ?? null, hasPassword: Boolean(a?.password_hash) };
    }),
  );
}

export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (!isUuid(body.staffId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const username = body.username === undefined ? undefined : normalizeUsername(body.username);
  if (username !== undefined) {
    const err = usernameError(username);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  const password = body.password ? String(body.password) : undefined;
  if (password !== undefined) {
    const err = passwordError(password);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: staff } = await db.from("staff").select("id, account_id").eq("id", body.staffId).maybeSingle();
  if (!staff) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

  if (username !== undefined) {
    const { data: taken } = await db.from("accounts").select("id").eq("username", username).maybeSingle();
    if (taken && taken.id !== staff.account_id) return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" }, { status: 409 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (username !== undefined) patch.username = username;
  if (password !== undefined) Object.assign(patch, { password_hash: bcrypt.hashSync(password, 10), failed_attempts: 0, locked_until: null });

  if (staff.account_id) {
    const { error } = await db.from("accounts").update(patch).eq("id", staff.account_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    if (!username) return NextResponse.json({ error: "ต้องตั้งชื่อผู้ใช้" }, { status: 400 });
    const { data: acc, error } = await db.from("accounts").insert(patch).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from("staff").update({ account_id: acc.id }).eq("id", staff.id);
  }
  return NextResponse.json({ ok: true });
}
