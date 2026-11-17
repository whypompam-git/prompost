import { NextResponse } from "next/server";
import { chatIdOf, extractLinkCode, repliesFor, verifyLineSignature } from "@/lib/lineWebhook";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIGEST_TOPICS } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const TOPIC_LABEL: Record<string, string> = { ...Object.fromEntries(DIGEST_TOPICS.map((t) => [t.key, t.label])), editor: "อัปเดตงาน Editor" };

// A group typed a "PP-123456" link code: attach this group to the channel that code belongs to.
async function linkReply(code: string, chatId: string | null, isGroup: boolean): Promise<string> {
  if (!chatId || !isGroup) return "พิมพ์รหัสนี้ในกลุ่ม LINE ที่ต้องการเชื่อม (เชิญบอทเข้ากลุ่มก่อน)";
  const db = createAdminClient();
  const { data: ch } = await db
    .from("line_channels")
    .select("id, name, topics, workspace_id, link_expires_at, workspaces(name, line_enabled)")
    .eq("link_code", code)
    .maybeSingle();
  if (!ch || !ch.link_expires_at || Date.parse(ch.link_expires_at) < Date.now()) {
    return "❌ รหัสไม่ถูกต้องหรือหมดอายุแล้ว\nขอรหัสใหม่ที่ ตั้งค่า → ระบบ → ช่องทางส่ง LINE";
  }
  const ws = (Array.isArray(ch.workspaces) ? ch.workspaces[0] : ch.workspaces) as { name: string; line_enabled: boolean } | null;
  if (!ws?.line_enabled) return "Workspace นี้ยังไม่ได้เปิดใช้ LINE — ติดต่อผู้ดูแลระบบ";
  const { error } = await db
    .from("line_channels")
    .update({ group_id: chatId, link_code: null, link_expires_at: null, linked_at: new Date().toISOString(), enabled: true })
    .eq("id", ch.id);
  if (error) return "เชื่อมไม่สำเร็จ ลองอีกครั้ง";
  const topics = ((ch.topics as string[]) ?? []).map((t) => TOPIC_LABEL[t] ?? t).join(", ");
  return `✅ เชื่อมกลุ่มนี้แล้ว\nWorkspace: ${ws.name}\nช่อง: ${ch.name}\nจะได้รับ: ${topics || "-"}`;
}

// LINE Messaging API webhook: link a group by its code, or answer "id".
// Requests must carry a valid LINE signature, so nobody else can drive it.
export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return NextResponse.json({ error: "LINE_CHANNEL_SECRET is not set" }, { status: 503 });

  const raw = await request.text();
  if (!verifyLineSignature(raw, request.headers.get("x-line-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: { events?: Parameters<typeof repliesFor>[0] } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (token) {
    const replies: { replyToken: string; text: string }[] = [];
    const events = body.events ?? [];
    for (const e of events) {
      const code = e.type === "message" && e.message?.type === "text" ? extractLinkCode(e.message.text) : null;
      if (code && e.replyToken) replies.push({ replyToken: e.replyToken, text: await linkReply(code, chatIdOf(e.source), Boolean(e.source?.groupId || e.source?.roomId)) });
    }
    replies.push(...repliesFor(events));
    for (const r of replies) {
      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ replyToken: r.replyToken, messages: [{ type: "text", text: r.text }] }),
      }).catch((err) => console.error("LINE reply failed", err));
    }
  }
  // LINE's "Verify" button posts an empty events list and expects 200
  return NextResponse.json({ ok: true });
}
