import { NextResponse } from "next/server";
import { CLIENT_COUNTS, INTERESTS, ROLES, SOURCES, TEAM_SIZES, normalizePhone, validEmail, validPhone } from "@/lib/waitlist";
import { LIMITS, clientIp } from "@/lib/rateLimitRules";
import { hashKey, record, tooMany } from "@/lib/rateLimit";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { SHOP_WORKSPACE_ID } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = (v: unknown, list: readonly (readonly [string, string])[]) => (typeof v === "string" && list.some((x) => x[0] === v) ? v : "");

// Public sign-up for early access. The PromPost workspace owns the list.
export async function POST(request: Request) {
  const ip = hashKey(clientIp(request.headers));
  if (await tooMany("waitlist", ip, LIMITS.waitlistPerIpHour)) return NextResponse.json({ error: "ลงชื่อหลายครั้งเกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  const b = await request.json().catch(() => ({}));
  if (text(b.website, 50)) return NextResponse.json({ ok: true, position: 1 }); // honeypot: bots fill the hidden field
  const name = text(b.name, 120);
  const phone = normalizePhone(text(b.phone, 30));
  const email = text(b.email, 160).toLowerCase();
  const lineId = text(b.lineId, 80);
  if (!name) return NextResponse.json({ error: "กรอกชื่อ" }, { status: 400 });
  if (!validPhone(phone)) return NextResponse.json({ error: "เบอร์โทรไม่ถูกต้อง (ตัวเลข 9–10 หลัก)" }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  if (!lineId && !email) return NextResponse.json({ error: "ใส่ LINE ID หรืออีเมลอย่างน้อย 1 ช่องทาง เพื่อให้เราติดต่อกลับได้" }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: "ติ๊กยอมรับให้เก็บข้อมูลเพื่อติดต่อกลับก่อน" }, { status: 400 });
  const role = oneOf(b.role, ROLES);
  if (!role) return NextResponse.json({ error: "เลือกว่าคุณทำงานด้านไหน" }, { status: 400 });
  const interests = Array.isArray(b.interests) ? b.interests.filter((x: unknown) => typeof x === "string" && INTERESTS.some((i) => i[0] === x)).slice(0, 10) : [];

  const db = workspaceDb(SHOP_WORKSPACE_ID);
  const { error } = await db.from("waitlist_signups").insert({
    workspace_id: SHOP_WORKSPACE_ID, name, phone, line_id: lineId, email,
    business_name: text(b.businessName, 120), role, team_size: oneOf(b.teamSize, TEAM_SIZES), client_count: oneOf(b.clientCount, CLIENT_COUNTS),
    source: oneOf(b.source, SOURCES), source_clip: text(b.sourceClip, 200), interests, message: text(b.message, 600), consent: true, utm: text(b.utm, 60),
  });
  if (error && !/duplicate key|waitlist_signups_workspace_id_phone_key/.test(error.message)) return NextResponse.json({ error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
  await record("waitlist", ip);
  const { data: me } = await db.from("waitlist_signups").select("created_at").eq("phone", phone).maybeSingle();
  const { count } = await db.from("waitlist_signups").select("id", { count: "exact", head: true }).lt("created_at", me?.created_at ?? new Date().toISOString());
  return NextResponse.json({ ok: true, again: Boolean(error), position: (count ?? 0) + 1 });
}
