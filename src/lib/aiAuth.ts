import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Bearer-token gate for /api/ai/*. The token lives in the AI_API_TOKEN env var
// (Vercel). Refuses to run when it is missing or weak, so a misconfigured
// deployment can never expose these endpoints.
export function requireAiToken(request: Request): NextResponse | null {
  const token = process.env.AI_API_TOKEN;
  if (!token || token.length < 24) {
    return NextResponse.json({ error: "AI_API_TOKEN ยังไม่ได้ตั้งค่า (ต้องยาวอย่างน้อย 24 ตัวอักษร)" }, { status: 503 });
  }
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;
  const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return ok ? null : NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
