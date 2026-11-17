import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { buildDigestText, lineConfigured, lineEnabledFor, lineTokenSet, pushLine } from "@/lib/lineDigest";
import { PROMPOST_WORKSPACE_ID, workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

// Owner-only "send today's digest now" (and preview) from Settings → ระบบ.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  const live = claims ? await fetchLiveAccess(claims.staffId) : null;
  if (!live || !live.active || live.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });

  const { send, channelId } = await request.json().catch(() => ({}));
  const ws = live.workspaceId;
  if (send && !(await lineEnabledFor(ws))) return NextResponse.json({ sent: false, reason: "LINE ยังไม่ได้เปิดให้ workspace นี้" });
  try {
    if (typeof channelId === "string") {
      const { data: c } = await workspaceDb(ws)
        .from("line_channels")
        .select("name, group_id, topics, team_id")
        .eq("id", channelId)
        .maybeSingle();
      if (!c) return NextResponse.json({ error: "ไม่พบช่องทางนี้" }, { status: 404 });
      if (!c.group_id) return NextResponse.json({ sent: false, reason: "ยังไม่ได้เชื่อมกลุ่ม — พิมพ์รหัส PP-xxxxxx ในกลุ่มก่อน" });
      const text = await buildDigestText(ws, new Date(), { topics: c.topics, teamId: c.team_id });
      if (!send) return NextResponse.json({ configured: lineTokenSet(), text });
      if (!lineTokenSet()) return NextResponse.json({ sent: false, reason: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน Vercel" });
      await pushLine(text ?? `✅ ทดสอบช่อง "${c.name}" — วันนี้ไม่มีเรื่องที่ต้องแจ้ง`, c.group_id);
      return NextResponse.json({ sent: true });
    }
    const text = await buildDigestText(ws);
    if (!send) return NextResponse.json({ configured: lineConfigured(), text });
    // the single LINE_TO group belongs to PromPost; other workspaces send through their channels
    if (ws !== PROMPOST_WORKSPACE_ID) return NextResponse.json({ sent: false, reason: "ตั้งช่องทางส่ง LINE ก่อน" });
    if (!text) return NextResponse.json({ sent: false, reason: "ไม่มีเรื่องที่ต้องแจ้งวันนี้" });
    if (!lineConfigured()) return NextResponse.json({ sent: false, reason: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN / LINE_TO ใน Vercel" });
    await pushLine(text);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
