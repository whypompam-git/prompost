import { NextResponse, type NextRequest } from "next/server";
import { requireMe } from "@/lib/myWork";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The editor changes their own profile photo (a small resized image as a data URL).
export async function POST(request: NextRequest) {
  const me = await requireMe(request);
  if (me instanceof NextResponse) return me;
  const { dataUrl } = await request.json().catch(() => ({}));
  if (typeof dataUrl !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) || dataUrl.length > 400_000) {
    return NextResponse.json({ error: "รูปไม่ถูกต้องหรือใหญ่เกินไป" }, { status: 400 });
  }
  const { error } = await createAdminClient().from("staff").update({ photo_url: dataUrl }).eq("id", me.staffId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
