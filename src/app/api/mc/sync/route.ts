import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { syncMcSheet } from "@/lib/mcSync";

export const dynamic = "force-dynamic";

// "อัปเดตจากชีต" button on the MC page — owner or anyone with the MC permission.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  const live = claims ? await fetchLiveAccess(claims.staffId) : null;
  if (!live || !live.active || (live.role !== "owner" && !live.permissions.mc)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }
  const result = await syncMcSheet();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
