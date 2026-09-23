import { SignJWT, jwtVerify } from "jose";
import type { StaffRole } from "@/lib/types";

export const SESSION_COOKIE = "pp_session";
const SESSION_DURATION = 60 * 60 * 24 * 180; // 180 days — "the device should remember"

export type SessionClaims = {
  staffId: string;
  name: string;
  role: StaffRole;
  canViewAccounting: boolean;
  canViewHr: boolean;
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
      canViewAccounting: payload.canViewAccounting as boolean,
      canViewHr: payload.canViewHr as boolean,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_DURATION;
