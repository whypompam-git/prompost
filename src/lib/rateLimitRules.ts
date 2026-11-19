// Pure rules for anti-abuse limits (shared by routes and tests).

export type Limit = { max: number; windowMs: number };

const MIN = 60_000;
const HOUR = 60 * MIN;
export const LIMITS = {
  signupPerIpHour: { max: 3, windowMs: HOUR },
  signupPerIpDay: { max: 10, windowMs: 24 * HOUR },
  signupAllHour: { max: 60, windowMs: HOUR }, // the whole platform: a flood from many IPs
  loginFailPerIp: { max: 20, windowMs: 15 * MIN }, // on top of the 5-try lock per account
  joinPerAccountHour: { max: 10, windowMs: HOUR },
  shopOrderPerIpHour: { max: 10, windowMs: HOUR },
  shopSlipPerIpHour: { max: 20, windowMs: HOUR },
  waitlistPerIpHour: { max: 5, windowMs: HOUR },
  shopLookupPerIp: { max: 60, windowMs: 15 * MIN },
  pinFailPerIp: { max: 30, windowMs: 15 * MIN }, // client-link PINs, on top of the per-link lock
} satisfies Record<string, Limit>;

export const FORM_MIN_AGE_MS = 3_000; // people take a few seconds to fill a form; scripts don't
export const FORM_MAX_AGE_MS = 2 * HOUR;

export function formAgeError(issuedAt: number, now: number): string | null {
  const age = now - issuedAt;
  if (!(age >= 0) || age > FORM_MAX_AGE_MS) return "หน้านี้เปิดค้างนานไป รีเฟรชแล้วลองใหม่";
  if (age < FORM_MIN_AGE_MS) return "ส่งเร็วเกินไป รอสักครู่แล้วกดอีกครั้ง";
  return null;
}

// the first address in x-forwarded-for is the visitor (Vercel puts it there)
export function clientIp(headers: { get(name: string): string | null }): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] ?? headers.get("x-real-ip") ?? "").trim() || "unknown";
}
