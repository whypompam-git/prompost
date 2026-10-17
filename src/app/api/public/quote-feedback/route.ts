import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public: the client leaves a "please change X" note on the quotation they
// were sent. Knowing the unguessable share token is the authorization.
export async function POST(request: Request) {
  const { token, feedback } = await request.json().catch(() => ({}));
  if (typeof token !== "string" || typeof feedback !== "string" || !feedback.trim() || feedback.length > 5000) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quotations")
    .update({ client_feedback: feedback.trim() })
    .eq("share_token", token)
    .select("id");
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
