import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { buildDigestText, lineConfigured, pushLine } from "@/lib/lineDigest";

export const dynamic = "force-dynamic";

// Owner-only "send today's digest now" (and preview) from Settings → ระบบ.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  const live = claims ? await fetchLiveAccess(claims.staffId) : null;
  if (!live || !live.active || live.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });

  const { send } = await request.json().catch(() => ({}));
  try {
    const text = await buildDigestText();
    if (!send) return NextResponse.json({ configured: lineConfigured(), text });
    if (!text) return NextResponse.json({ sent: false, reason: "ไม่มีเรื่องที่ต้องแจ้งวันนี้" });
    if (!lineConfigured()) return NextResponse.json({ sent: false, reason: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN / LINE_TO ใน Vercel" });
    await pushLine(text);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
