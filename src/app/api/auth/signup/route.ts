import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUsername, passwordError, usernameError } from "@/lib/accountRules";
import { setSessions } from "@/lib/auth/accountServer";

export const dynamic = "force-dynamic";

// Create a login (no workspace yet) → /welcome to create or join one.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const err = usernameError(username) ?? passwordError(body.password);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const displayName = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (displayName.length < 1) return NextResponse.json({ error: "ใส่ชื่อที่จะให้ทีมเห็น" }, { status: 400 });

  const db = createAdminClient();
  const { data: taken } = await db.from("accounts").select("id").eq("username", username).maybeSingle();
  if (taken) return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" }, { status: 409 });
  const { data: acc, error } = await db
    .from("accounts")
    .insert({ username, display_name: displayName, password_hash: bcrypt.hashSync(body.password, 10) })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "ชื่อผู้ใช้นี้มีคนใช้แล้ว" : error.message }, { status: 400 });

  const res = NextResponse.json({ ok: true, next: "/welcome" });
  await setSessions(res, acc.id);
  return res;
}
