import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDigestText, lineConfigured, lineTokenSet, pushLine } from "@/lib/lineDigest";

export const dynamic = "force-dynamic";

// Owner-only "send today's digest now" (and preview) from Settings → ระบบ.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  const live = claims ? await fetchLiveAccess(claims.staffId) : null;
  if (!live || !live.active || live.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });

  const { send, channelId } = await request.json().catch(() => ({}));
  try {
    if (typeof channelId === "string") {
      const { data: c } = await createAdminClient()
        .from("line_channels")
        .select("name, group_id, topics, team_id")
        .eq("id", channelId)
        .maybeSingle();
      if (!c) return NextResponse.json({ error: "ไม่พบช่องทางนี้" }, { status: 404 });
      const text = await buildDigestText(new Date(), { topics: c.topics, teamId: c.team_id });
      if (!send) return NextResponse.json({ configured: lineTokenSet(), text });
      if (!lineTokenSet()) return NextResponse.json({ sent: false, reason: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน Vercel" });
      await pushLine(text ?? `✅ ทดสอบช่อง "${c.name}" — วันนี้ไม่มีเรื่องที่ต้องแจ้ง`, c.group_id);
      return NextResponse.json({ sent: true });
    }
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
