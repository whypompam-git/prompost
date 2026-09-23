import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE, signSession } from "@/lib/auth/session";

// Verifies a 4-digit PIN against the staff row's pin_hash, server-side only
// (via the service-role admin client — pin_hash is never sent to the
// browser anywhere else). On success, sets a signed session cookie.
export async function POST(request: Request) {
  const { staffId, pin } = await request.json();

  if (typeof staffId !== "string" || typeof pin !== "string") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, name, pin_hash, role, can_view_accounting, can_view_hr")
    .eq("id", staffId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !staff || !staff.pin_hash) {
    return NextResponse.json({ error: "invalid PIN" }, { status: 401 });
  }

  const ok = bcrypt.compareSync(pin, staff.pin_hash);
  if (!ok) {
    return NextResponse.json({ error: "invalid PIN" }, { status: 401 });
  }

  const token = await signSession({
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
    canViewAccounting: staff.can_view_accounting,
    canViewHr: staff.can_view_hr,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return res;
}
