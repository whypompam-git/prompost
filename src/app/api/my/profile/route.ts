import { NextResponse, type NextRequest } from "next/server";
import { requireMe } from "@/lib/myWork";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The editor's own profile: photo, finished clips (with the Drive link) and
// payment vouchers still waiting for their signature. No prices of other people.
export async function GET(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const db = createAdminClient();
  const [{ data: staff }, { data: done }, { data: contracts }] = await Promise.all([
    db.from("staff").select("name, photo_url, position").eq("id", me.staffId).maybeSingle(),
    db.from("tasks").select("id, title, final_url, cover_url, type, edit_date, clients(name)").eq("editor_id", me.staffId).in("type", ["approved", "posted"]).order("edit_date", { ascending: false }).limit(300),
    db.from("contracts").select("id, contract_no").eq("staff_id", me.staffId).eq("status", "signed"),
  ]);
  const cids = (contracts ?? []).map((c) => c.id);
  const { data: vouchers } = cids.length
    ? await db.from("contract_payments").select("id, description, net, paid_at, receipt_token, payee_signed_at").in("contract_id", cids).order("created_at", { ascending: false })
    : { data: [] as { id: string; description: string; net: number; paid_at: string | null; receipt_token: string; payee_signed_at: string | null }[] };
  return NextResponse.json({
    name: staff?.name ?? me.name,
    photoUrl: staff?.photo_url ?? null,
    position: staff?.position ?? "",
    done: (done ?? []).map((t) => {
      const c = Array.isArray(t.clients) ? t.clients[0] : t.clients;
      return { id: t.id, title: t.title, finalUrl: t.final_url, coverUrl: t.cover_url, clientName: (c as { name: string } | null)?.name ?? "" };
    }),
    vouchers: (vouchers ?? []).map((v) => ({ id: v.id, description: v.description, net: Number(v.net), paidAt: v.paid_at, token: v.receipt_token, signed: Boolean(v.payee_signed_at) })),
  });
}
