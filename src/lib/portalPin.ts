import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName } from "@/lib/portalPinRules";

// SERVER-ONLY. Who may see a client link:
//   * staff logged into the client's own workspace — always (no PIN)
//   * anyone holding this client's PIN cookie, issued after entering the PIN; resetting the
//     PIN (new set_at) invalidates every cookie issued before
// "set": no PIN yet → the first visitor sets it. "enter": PIN needed.
export type PortalGate = "open" | "set" | "enter";
type PortalClient = { id: string; workspace_id: string };

const PIN_DAYS = 30;
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

export async function pinRow(clientId: string) {
  const { data } = await createAdminClient().from("client_portal_pins").select("pin_hash, failed_attempts, locked_until, set_at").eq("client_id", clientId).maybeSingle();
  return data as { pin_hash: string; failed_attempts: number; locked_until: string | null; set_at: string } | null;
}

export async function staffOfWorkspace(workspaceId: string): Promise<boolean> {
  const claims = await verifySession(cookies().get(SESSION_COOKIE)?.value ?? "");
  if (!claims) return false;
  const live = await fetchLiveAccess(claims.staffId);
  return Boolean(live?.active && live.workspaceId === workspaceId);
}

export async function portalGate(client: PortalClient): Promise<PortalGate> {
  if (await staffOfWorkspace(client.workspace_id)) return "open";
  const row = await pinRow(client.id);
  if (!row) return "set";
  const token = cookies().get(portalCookieName(client.id))?.value;
  if (!token) return "enter";
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.typ === "portal" && payload.clientId === client.id && payload.v === row.set_at ? "open" : "enter";
  } catch {
    return "enter";
  }
}

export async function portalCookie(clientId: string, setAt: string) {
  const token = await new SignJWT({ typ: "portal", clientId, v: setAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PIN_DAYS}d`)
    .sign(key());
  return {
    name: portalCookieName(clientId),
    value: token,
    options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: PIN_DAYS * 86_400 },
  };
}
