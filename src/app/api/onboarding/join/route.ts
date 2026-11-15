import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberships, requireAccount } from "@/lib/auth/accountServer";
import { normalizeHandle } from "@/lib/workspaceRules";
import { LIMITS } from "@/lib/rateLimitRules";
import { record, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Join: type a Workspace ID → a request the workspace's owner approves in Settings → พนักงาน.
// Nothing about the workspace is shown until the owner approves.
export async function POST(request: NextRequest) {
  const acc = await requireAccount(request);
  if (acc instanceof NextResponse) return acc;
  const { handle: raw } = await request.json().catch(() => ({}));
  const handle = normalizeHandle(raw);
  if (!handle) return NextResponse.json({ error: "ใส่ Workspace ID" }, { status: 400 });
  // guessing Workspace IDs one after another
  if (await tooMany("join", acc, LIMITS.joinPerAccountHour)) return NextResponse.json({ error: "ลองหลายครั้งเกินไป ลองใหม่ในอีกชั่วโมง" }, { status: 429 });
  await record("join", acc);

  const db = createAdminClient();
  const { data: ws } = await db.from("workspaces").select("id, name, join_open").eq("handle", handle).maybeSingle();
  if (!ws || !ws.join_open) return NextResponse.json({ error: "ไม่พบ Workspace นี้ หรือยังไม่เปิดรับคนเข้าร่วม" }, { status: 404 });
  if ((await memberships(acc)).some((m) => m.workspaceId === ws.id)) return NextResponse.json({ error: "คุณอยู่ใน Workspace นี้แล้ว" }, { status: 400 });

  const { error } = await db.from("workspace_join_requests").insert({ workspace_id: ws.id, account_id: acc });
  if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
  // tell the owners
  const { data: owners } = await db.from("staff").select("id").eq("workspace_id", ws.id).eq("role", "owner").eq("is_active", true);
  const { data: me } = await db.from("accounts").select("username, display_name").eq("id", acc).maybeSingle();
  if (owners?.length) {
    await db.from("notifications").insert(
      owners.map((o) => ({ recipient_id: o.id, kind: "join_request", title: `${me?.display_name || me?.username} ขอเข้าร่วม Workspace`, body: "อนุมัติได้ที่ ตั้งค่า → พนักงาน", workspace_id: ws.id })),
    );
  }
  return NextResponse.json({ ok: true, workspaceName: ws.name });
}
