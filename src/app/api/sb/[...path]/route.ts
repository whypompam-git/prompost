import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { authorizeProxyRequest } from "@/lib/supabase/proxyRules";

// Authenticated pass-through to Supabase REST + Storage. The browser client
// sends every call here (see src/lib/supabase/client.ts); we check the login
// session and the per-table rules, then call Supabase with the service-role
// key. Once the database is locked down (supabase/lockdown/), this is the only
// way in — the public anon key can no longer read or write anything.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Headers worth carrying to / from Supabase (everything else is dropped).
const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-profile",
  "cache-control",
  "content-profile",
  "content-type",
  "prefer",
  "range",
  "range-unit",
  "x-upsert",
];
const FORWARD_RESPONSE_HEADERS = ["content-type", "content-range", "content-profile", "preference-applied", "etag", "location"];

// Live access (role / permissions / active) is re-read from the database, but
// not on every one of the ~10 requests a page fires at once: 15 s is plenty
// for a permission change or a deactivation to take effect.
type Access = NonNullable<Awaited<ReturnType<typeof fetchLiveAccess>>>;
const ACCESS_TTL_MS = 15_000;
const accessCache = new Map<string, { at: number; value: Access }>();

async function liveAccess(staffId: string): Promise<Access | null> {
  const hit = accessCache.get(staffId);
  if (hit && Date.now() - hit.at < ACCESS_TTL_MS) return hit.value;
  const value = await fetchLiveAccess(staffId);
  if (value) accessCache.set(staffId, { at: Date.now(), value });
  else accessCache.delete(staffId);
  return value;
}

async function handle(request: NextRequest, { params }: { params: { path: string[] } }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return NextResponse.json({ message: "not logged in" }, { status: 401 });

  const live = await liveAccess(claims.staffId);
  if (!live || !live.active) return NextResponse.json({ message: "account disabled" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ message: "server not configured" }, { status: 500 });

  const path = params.path.join("/");
  const method = request.method.toUpperCase();
  const incoming = request.nextUrl.search;
  const hasBody = method !== "GET" && method !== "HEAD";
  const raw = hasBody ? await request.arrayBuffer() : undefined;

  let parsed: unknown;
  if (raw && raw.byteLength > 0 && (request.headers.get("content-type") ?? "").includes("json")) {
    try {
      parsed = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return NextResponse.json({ message: "invalid JSON body" }, { status: 400 });
    }
  }

  const decision = authorizeProxyRequest({
    method,
    path,
    search: incoming,
    body: parsed,
    access: {
      staffId: claims.staffId,
      role: live.role,
      hideInternal: live.hideInternal,
      ownOnly: live.ownOnly,
      permissions: {
        documents: live.permissions.documents,
        accounting: live.permissions.accounting,
        othersPayroll: live.permissions.othersPayroll,
        mc: live.permissions.mc,
      },
    },
  });
  if (!decision.ok) return NextResponse.json({ message: decision.reason }, { status: decision.status });

  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` };
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  // for restricted people a write may only come back with the columns the rules allowed
  if (decision.minimalReturn) headers["prefer"] = "return=minimal";

  const upstream = await fetch(`${url}/${path}${decision.search}`, {
    method,
    headers,
    body: raw && raw.byteLength > 0 ? raw : undefined,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("cache-control", "no-store");
  return new Response(upstream.status === 204 || upstream.status === 304 ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE, handle as HEAD };
