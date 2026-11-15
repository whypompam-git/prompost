import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPortalClient } from "@/lib/portalClient";
import { pinRow, portalCookie } from "@/lib/portalPin";
import { PORTAL_PIN_LOCK_MINUTES, PORTAL_PIN_MAX_FAILS, portalPinError } from "@/lib/portalPinRules";

export const dynamic = "force-dynamic";

// Client link PIN: action "set" (only while none exists) or "enter". Success → a cookie for this client.
export async function POST(request: Request) {
  const { clientKey, pin, action } = await request.json().catch(() => ({}));
  if (typeof clientKey !== "string" || !["set", "enter"].includes(action)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const err = portalPinError(pin);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const client = await findPortalClient(clientKey);
  if (!client || !client.portal_enabled) return NextResponse.json({ error: "ลิงก์นี้ใช้ไม่ได้แล้ว" }, { status: 404 });

  const db = createAdminClient();
  const row = await pinRow(client.id);
  let setAt: string;

  if (action === "set") {
    if (row) return NextResponse.json({ error: "ลิงก์นี้ตั้ง PIN ไว้แล้ว ใส่ PIN เพื่อเข้า" }, { status: 409 });
    const { data, error } = await db
      .from("client_portal_pins")
      .insert({ client_id: client.id, pin_hash: bcrypt.hashSync(pin, 10) })
      .select("set_at")
      .single();
    // two people setting at the same moment: the first one wins
    if (error) return NextResponse.json({ error: error.code === "23505" ? "ลิงก์นี้ตั้ง PIN ไว้แล้ว ใส่ PIN เพื่อเข้า" : error.message }, { status: error.code === "23505" ? 409 : 500 });
    setAt = data.set_at;
  } else {
    if (!row) return NextResponse.json({ error: "ยังไม่ได้ตั้ง PIN" }, { status: 409 });
    const left = row.locked_until ? Date.parse(row.locked_until) - Date.now() : 0;
    if (left > 0) return NextResponse.json({ error: `ใส่ผิดหลายครั้ง ลองใหม่อีก ${Math.ceil(left / 60_000)} นาที` }, { status: 429 });
    if (!bcrypt.compareSync(pin, row.pin_hash)) {
      const fails = (row.failed_attempts ?? 0) + 1;
      const lock = fails >= PORTAL_PIN_MAX_FAILS;
      await db
        .from("client_portal_pins")
        .update({ failed_attempts: lock ? 0 : fails, locked_until: lock ? new Date(Date.now() + PORTAL_PIN_LOCK_MINUTES * 60_000).toISOString() : null })
        .eq("client_id", client.id);
      return NextResponse.json({ error: lock ? `ใส่ผิด ${PORTAL_PIN_MAX_FAILS} ครั้ง ล็อก ${PORTAL_PIN_LOCK_MINUTES} นาที` : "PIN ไม่ถูกต้อง" }, { status: 401 });
    }
    if (row.failed_attempts) await db.from("client_portal_pins").update({ failed_attempts: 0, locked_until: null }).eq("client_id", client.id);
    setAt = row.set_at;
  }

  const c = await portalCookie(client.id, setAt);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
