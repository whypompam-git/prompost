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
export async function fetchLiveAccess(staffId: string): Promise<{
  active: boolean;
  role: StaffRole;
  permissions: Permissions;
  name: string;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/staff?id=eq.${encodeURIComponent(staffId)}&select=name,role,is_active,permissions,can_view_accounting`,
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
      permissions:
        role === "owner"
          ? ALL_PERMISSIONS
          : normalizePermissions(r.permissions, Boolean(r.can_view_accounting)),
    };
  } catch {
    return null;
  }
}
