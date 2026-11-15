import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller } from "@/lib/draftsServer";
import { workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

// Client-link PIN status (staff of the workspace) and reset (owner): after a reset the next
// person to open the link sets a new PIN, and every device that had the old one is asked again.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available" }, { status: 403 });
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!isUuid(clientId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { data } = await workspaceDb(c.workspaceId).from("client_portal_pins").select("set_at, locked_until").eq("client_id", clientId).maybeSingle();
  return NextResponse.json({ set: Boolean(data), setAt: data?.set_at ?? null, locked: Boolean(data?.locked_until && Date.parse(data.locked_until) > Date.now()) });
}

export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "เจ้าของเท่านั้นที่รีเซ็ต PIN ได้" }, { status: 403 });
  const { clientId } = await request.json().catch(() => ({}));
  if (!isUuid(clientId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { error } = await workspaceDb(c.workspaceId).from("client_portal_pins").delete().eq("client_id", clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
