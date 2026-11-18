import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITS, clientIp } from "@/lib/rateLimitRules";
import { hashKey, record, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Public: a one-shot signed upload URL for a payment slip (private bucket). The slip is tied to
// the order when it is placed; slips that never get an order are just orphans.
export async function POST(request: Request) {
  const ip = hashKey(clientIp(request.headers));
  if (await tooMany("shop_slip", ip, LIMITS.shopSlipPerIpHour)) return NextResponse.json({ error: "ลองหลายครั้งเกินไป รอสักพัก" }, { status: 429 });
  const { ext } = await request.json().catch(() => ({}));
  const safeExt = typeof ext === "string" && /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext.toLowerCase() : "jpg";
  const path = `${crypto.randomUUID()}.${safeExt}`;
  const { data, error } = await createAdminClient().storage.from("shop-slips").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "failed" }, { status: 500 });
  await record("shop_slip", ip);
  return NextResponse.json({ path: data.path, token: data.token });
}
