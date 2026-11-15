import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUsername, passwordError, usernameError } from "@/lib/accountRules";
import { setSessions } from "@/lib/auth/accountServer";
import { SignJWT, jwtVerify } from "jose";
import { LIMITS, clientIp, formAgeError } from "@/lib/rateLimitRules";
import { hashKey, record, tooMany } from "@/lib/rateLimit";

const formKey = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

// The sign-up page asks for a form token first; it must be a few seconds old when used.
export async function GET() {
  const token = await new SignJWT({ typ: "signup-form", t: Date.now() }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("3h").sign(formKey());
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}

async function formIssuedAt(token: unknown): Promise<number> {
  if (typeof token !== "string") return Number.NaN;
  try {
    const { payload } = await jwtVerify(token, formKey());
    return payload.typ === "signup-form" && typeof payload.t === "number" ? payload.t : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

export const dynamic = "force-dynamic";

// Create a login (no workspace yet) → /welcome to create or join one.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // a hidden field people never see: only scripts fill it
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ error: "สมัครไม่สำเร็จ" }, { status: 400 });
  const ageErr = formAgeError(await formIssuedAt(body.formToken), Date.now());
  if (ageErr) return NextResponse.json({ error: ageErr }, { status: 400 });
  const ip = hashKey(clientIp(request.headers));
  if ((await tooMany("signup", ip, LIMITS.signupPerIpHour)) || (await tooMany("signup", ip, LIMITS.signupPerIpDay)) || (await tooMany("signup", "all", LIMITS.signupAllHour))) {
    return NextResponse.json({ error: "สมัครจากเครือข่ายนี้หลายครั้งเกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  }
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

  await Promise.all([record("signup", ip), record("signup", "all")]);
  const res = NextResponse.json({ ok: true, next: "/welcome" });
  await setSessions(res, acc.id);
  return res;
}
