import { NextResponse, type NextRequest } from "next/server";
import { workspaceDb } from "@/lib/supabase/workspaceDb";
import { loadSettings, saleStaff } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  return NextResponse.json(await loadSettings(me.workspaceId));
}

export async function PUT(request: NextRequest) {
  const me = await saleStaff(request);
  if (me instanceof NextResponse) return me;
  const b = await request.json().catch(() => ({}));
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const promptpayId = s(b.promptpayId, 30).replace(/[^\d]/g, "");
  if (promptpayId && ![10, 13].includes(promptpayId.length)) return NextResponse.json({ error: "พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก" }, { status: 400 });
  const { error } = await workspaceDb(me.workspaceId).from("shop_settings").upsert(
    { workspace_id: me.workspaceId, title: s(b.title, 60) || "Gift", intro: s(b.intro, 600), promptpay_id: promptpayId, line_note: s(b.lineNote, 60) || "LINE HOPS", is_open: b.isOpen !== false, updated_at: new Date().toISOString() },
    { onConflict: "workspace_id" },
  );
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
