// Server-side helpers for the "งานของฉัน" endpoints used by people locked to
// their own work (outsourced editors). Everything here is checked against the
// logged-in person, never against ids the browser sends.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";

export async function requireMe(request: NextRequest): Promise<{ staffId: string; name: string } | NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ error: "account disabled" }, { status: 401 });
  return { staffId: claims.staffId, name: live.name };
}

export { MY_STAGES } from "./myWorkTypes.ts";
export type { MyTask } from "./myWorkTypes.ts";
