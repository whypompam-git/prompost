import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRIVATE_PREFIX } from "@/lib/contractServer";

export const dynamic = "force-dynamic";

const PNG_PREFIX = "data:image/png;base64,";

// Public: the payee signs the payment voucher sent to them (unguessable token). One signature only.
export async function POST(request: Request) {
  const { token, name, signature } = await request.json().catch(() => ({}));
  if (
    typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token) ||
    typeof name !== "string" || name.trim().length < 2 || name.length > 120 ||
    typeof signature !== "string" || !signature.startsWith(PNG_PREFIX) || signature.length > 2_000_000
  ) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: v } = await db.from("contract_payments").select("id, payee_signed_at").eq("receipt_token", token).maybeSingle();
  if (!v) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
  if (v.payee_signed_at) return NextResponse.json({ error: "ลงนามไปแล้ว" }, { status: 409 });

  const path = `vouchers/${v.id}.png`;
  const { error: upErr } = await db.storage.from("contracts").upload(path, Buffer.from(signature.slice(PNG_PREFIX.length), "base64"), { contentType: "image/png", upsert: true });
  if (upErr) return NextResponse.json({ error: "บันทึกลายเซ็นไม่สำเร็จ" }, { status: 500 });
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const { data: updated, error } = await db
    .from("contract_payments")
    .update({ payee_signer_name: name.trim(), payee_signature_path: `${PRIVATE_PREFIX}${path}`, payee_signed_at: new Date().toISOString(), payee_sign_ip: ip })
    .eq("id", v.id)
    .is("payee_signed_at", null)
    .select("id");
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "ลงนามไปแล้ว" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
