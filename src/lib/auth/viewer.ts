import { cookies } from "next/headers";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";

// Server components (print pages): the logged-in viewer's workspace, or null.
export async function viewerWorkspaceId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return null;
  const live = await fetchLiveAccess(claims.staffId);
  return live?.active ? live.workspaceId : null;
}
