import { NextResponse } from "next/server";
import { ACCOUNT_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(ACCOUNT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
