import { NextResponse, type NextRequest } from "next/server";
import { caller } from "@/lib/draftsServer";

export const dynamic = "force-dynamic";

// Owner: this month's LINE message quota (what the plan allows and what was used) straight from
// LINE — to tell "the bot is broken" from "the monthly push quota is used up".
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN ยังไม่ได้ตั้งค่า" }, { status: 503 });
  const h = { Authorization: `Bearer ${token}` };
  const [quota, used] = await Promise.all([
    fetch("https://api.line.me/v2/bot/message/quota", { headers: h }).then((r) => r.json().catch(() => null)),
    fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers: h }).then((r) => r.json().catch(() => null)),
  ]);
  return NextResponse.json({ plan: quota?.type ?? null, limit: quota?.value ?? null, used: used?.totalUsage ?? null });
}
