import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { caller } from "@/lib/draftsServer";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordError } from "@/lib/accountRules";

export const dynamic = "force-dynamic";

// Change your own password (needs the current one).
export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  const body = await request.json().catch(() => ({}));
  const err = passwordError(body.next);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const db = createAdminClient();
  const { data: me } = await db.from("staff").select("account_id").eq("id", c.staffId).maybeSingle();
  if (!me?.account_id) return NextResponse.json({ error: "ยังไม่มีบัญชีผู้ใช้ ให้หัวหน้าตั้งให้ก่อน" }, { status: 400 });
  const { data: acc } = await db.from("accounts").select("password_hash").eq("id", me.account_id).maybeSingle();
  if (!acc?.password_hash || typeof body.current !== "string" || !bcrypt.compareSync(body.current, acc.password_hash)) {
    return NextResponse.json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" }, { status: 400 });
  }
  const { error } = await db
    .from("accounts")
    .update({ password_hash: bcrypt.hashSync(body.next, 10), updated_at: new Date().toISOString() })
    .eq("id", me.account_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
