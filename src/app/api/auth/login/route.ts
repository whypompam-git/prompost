import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberships, setSessions } from "@/lib/auth/accountServer";
import { afterFailure, lockedMinutesLeft, normalizeUsername } from "@/lib/accountRules";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// a real bcrypt hash to compare against when the username doesn't exist, so a wrong
// username takes as long as a wrong password (no telling which usernames exist)
const DUMMY_HASH = "$2b$10$pudKBxsBg.IpOUCbG0EcHezXgwz5XsJ9sfm.Pe6oNu8gizFa8O1ya";
const WRONG = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

// Username + password → signed session cookie. Verification happens only here,
// server-side, with the service-role client; password hashes never reach the browser.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) return NextResponse.json({ error: WRONG }, { status: 400 });

  const db = createAdminClient();
  const { data: account } = await db
    .from("accounts")
    .select("id, password_hash, failed_attempts, locked_until")
    .eq("username", username)
    .maybeSingle();

  const now = new Date();
  const wait = lockedMinutesLeft(account?.locked_until, now);
  if (wait > 0) return NextResponse.json({ error: `ใส่รหัสผิดหลายครั้ง ลองใหม่อีก ${wait} นาที` }, { status: 429 });

  const ok = bcrypt.compareSync(password, account?.password_hash ?? DUMMY_HASH);
  if (!account || !account.password_hash || !ok) {
    if (account) await db.from("accounts").update(afterFailure(account.failed_attempts ?? 0, now)).eq("id", account.id);
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }
  if (account.failed_attempts) await db.from("accounts").update({ failed_attempts: 0, locked_until: null }).eq("id", account.id);

  // in a workspace: log straight in (the first one, or the one asked for); otherwise /welcome
  const all = await memberships(account.id);
  const pick = all.find((m) => m.workspaceId === body.workspaceId) ?? all[0];
  const res = NextResponse.json({ ok: true, next: pick ? null : "/welcome" });
  await setSessions(res, account.id, pick ? { id: pick.staffId, name: pick.name, role: pick.role } : undefined);
  return res;
}
