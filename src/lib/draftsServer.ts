import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Server-only helpers for draft videos (private "drafts" bucket).

export type Caller = { staffId: string; role: string; ownOnly: boolean };

export async function caller(request: NextRequest): Promise<Caller | NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ error: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ error: "account disabled" }, { status: 401 });
  return { staffId: claims.staffId, role: live.role, ownOnly: live.ownOnly };
}

// team members may touch any clip; an own-only editor only clips where they are the editor
export async function taskForCaller(c: Caller, taskId: string) {
  const { data } = await createAdminClient()
    .from("tasks")
    .select("id, title, type, status, client_id, editor_id, assignee_id, footage_url, final_url, revision_count")
    .eq("id", taskId)
    .maybeSingle();
  if (!data) return null;
  if (c.ownOnly && data.editor_id !== c.staffId) return null;
  return data;
}

export async function signedDraftUrl(path: string, download?: string): Promise<string | undefined> {
  const { data } = await createAdminClient().storage.from("drafts").createSignedUrl(path, 60 * 60 * 3, download ? { download } : undefined);
  return data?.signedUrl;
}
