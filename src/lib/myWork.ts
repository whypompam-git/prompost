// Server-side helpers for the "งานของฉัน" endpoints used by people locked to
// their own work (outsourced editors). Everything here is checked against the
// logged-in person, never against ids the browser sends.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";

export async function requireMe(request: NextRequest): Promise<{ staffId: string; name: string; workspaceId: string } | NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ error: "account disabled" }, { status: 401 });
  return { staffId: claims.staffId, name: live.name, workspaceId: live.workspaceId };
}

export { MY_STAGES } from "./myWorkTypes.ts";
export type { MyTask } from "./myWorkTypes.ts";

// "My clip": I am its editor, or it has no separate editor and I am the responsible person.
// Same rule the notifications use (editor ?? assignee), so what rings the bell also shows up
// in my list.
export const mineFilter = (staffId: string) => `editor_id.eq.${staffId},and(editor_id.is.null,assignee_id.eq.${staffId})`;
export const isMine = (t: { editor_id: string | null; assignee_id?: string | null }, staffId: string) =>
  t.editor_id === staffId || (!t.editor_id && t.assignee_id === staffId);
