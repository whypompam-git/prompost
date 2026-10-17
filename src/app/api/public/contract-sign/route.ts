import { NextResponse } from "next/server";
import { contractFingerprintSource, sha256Hex } from "@/lib/contractHash";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTRACT_COLUMNS, fromContractRow } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

const PNG_PREFIX = "data:image/png;base64,";

// Public: the client signs a contract that was sent to them. The unguessable
// share token authorises it; the evidence (time, IP, user agent, SHA-256 of the
// exact text agreed) is stored on the row, and a database trigger makes a
// signed contract immutable.
export async function POST(request: Request) {
  const { token, name, signature, consent } = await request.json().catch(() => ({}));
  if (
    typeof token !== "string" ||
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.length > 120 ||
    consent !== true ||
    typeof signature !== "string" ||
    !signature.startsWith(PNG_PREFIX) ||
    signature.length > 2_000_000
  ) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase.from("contracts").select(CONTRACT_COLUMNS).eq("share_token", token).maybeSingle();
  if (!row) return NextResponse.json({ error: "ไม่พบสัญญา" }, { status: 404 });
  if (row.status === "signed") return NextResponse.json({ error: "สัญญานี้ลงนามไปแล้ว" }, { status: 409 });
  if (row.status !== "sent") return NextResponse.json({ error: "สัญญายังไม่เปิดให้ลงนาม" }, { status: 409 });

  const { data: client } = await supabase.from("clients").select("portal_enabled").eq("id", row.client_id).maybeSingle();
  if (client && client.portal_enabled === false) return NextResponse.json({ error: "ลิงก์ถูกยกเลิก" }, { status: 403 });

  const contract = fromContractRow(row);
  const hash = await sha256Hex(contractFingerprintSource(contract));

  const path = `contract-signatures/${contract.id}.png`;
  const { error: uploadError } = await supabase.storage
    .from("client-brand")
    .upload(path, Buffer.from(signature.slice(PNG_PREFIX.length), "base64"), { contentType: "image/png", upsert: true });
  if (uploadError) return NextResponse.json({ error: "บันทึกลายเซ็นไม่สำเร็จ" }, { status: 500 });
  const signatureUrl = supabase.storage.from("client-brand").getPublicUrl(path).data.publicUrl;

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const { data: updated, error } = await supabase
    .from("contracts")
    .update({
      status: "signed",
      client_signer_name: name.trim(),
      client_signature_url: signatureUrl,
      client_signed_at: new Date().toISOString(),
      client_sign_ip: ip,
      client_sign_ua: (request.headers.get("user-agent") ?? "").slice(0, 400) || null,
      content_hash: hash,
    })
    .eq("id", contract.id)
    .eq("status", "sent") // a concurrent second signature loses
    .select("id");
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "สัญญานี้ลงนามไปแล้ว" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
