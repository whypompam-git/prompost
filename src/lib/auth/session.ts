import { SignJWT, jwtVerify } from "jose";
import { ALL_PERMISSIONS, normalizePermissions, type Permissions } from "@/lib/permissions";
import type { StaffRole } from "@/lib/types";

export const SESSION_COOKIE = "pp_session";
const SESSION_DURATION = 60 * 60 * 24 * 180; // 180 days — "the device should remember"

export type SessionClaims = {
  staffId: string;
  name: string;
  role: StaffRole;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      staffId: payload.staffId as string,
      name: payload.name as string,
      role: payload.role as StaffRole,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_DURATION;

// Live access lookup (works on the edge and in Node): permissions and role are
// read from the database on every gated request, so an owner's change to a
// staff member takes effect immediately instead of at their next login.
// A page view fires several server checks at once (layout, middleware, API
// routes); they share one lookup for a few seconds.
type LiveAccess = Awaited<ReturnType<typeof fetchLiveAccessUncached>>;
const LIVE_TTL_MS = 10_000;
const liveCache = new Map<string, { at: number; value: Promise<LiveAccess> }>();
export function fetchLiveAccess(staffId: string): Promise<LiveAccess> {
  const hit = liveCache.get(staffId);
  if (hit && Date.now() - hit.at < LIVE_TTL_MS) return hit.value;
  const value = fetchLiveAccessUncached(staffId).then((v) => {
    if (!v) liveCache.delete(staffId); // never cache a failed lookup
    return v;
  });
  liveCache.set(staffId, { at: Date.now(), value });
  if (liveCache.size > 500) liveCache.clear();
  return value;
}

async function fetchLiveAccessUncached(staffId: string): Promise<{
  active: boolean;
  role: StaffRole;
  permissions: Permissions;
  name: string;
  hideInternal: boolean; // position flagged "hide internal" (e.g. outsourced editors)
  ownOnly: boolean; // position locked to "my work only" (served by /api/my/*)
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // service key: once the database is locked down the anon key reads nothing
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/staff?id=eq.${encodeURIComponent(staffId)}&select=name,role,is_active,permissions,can_view_accounting,positions(hide_internal,own_only)`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const r = rows?.[0];
    if (!r) return null;
    const role = r.role as StaffRole;
    return {
      active: Boolean(r.is_active),
      role,
      name: r.name,
      // owners always see everything
      hideInternal: role !== "owner" && Boolean(r.positions?.hide_internal),
      ownOnly: role !== "owner" && Boolean(r.positions?.own_only),
      permissions:
        role === "owner"
          ? ALL_PERMISSIONS
          : normalizePermissions(r.permissions, Boolean(r.can_view_accounting)),
    };
  } catch {
    return null;
  }
}
