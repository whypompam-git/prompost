import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKETS = new Set(["slips", "client-brand"]);

// Logged-in staff ask for a one-shot signed upload URL, then upload the file
// straight to Supabase Storage — large files never pass through (and can't be
// blocked by) the serverless body-size limit, and storage needs no open
// anonymous insert policy.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ message: "not logged in" }, { status: 401 });
  const live = await fetchLiveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ message: "account disabled" }, { status: 401 });

  const { bucket, ext } = await request.json().catch(() => ({}));
  if (typeof bucket !== "string" || !BUCKETS.has(bucket)) {
    return NextResponse.json({ message: "bucket not allowed" }, { status: 403 });
  }
  const safeExt = typeof ext === "string" && /^[a-z0-9]{1,8}$/i.test(ext) ? ext.toLowerCase() : "bin";
  const path = `${crypto.randomUUID()}.${safeExt}`;

  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ message: error?.message ?? "failed" }, { status: 500 });
  return NextResponse.json({ path: data.path, token: data.token });
}
