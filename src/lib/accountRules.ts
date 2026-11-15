// Pure rules for usernames and passwords (shared by API routes, UI and tests).

export const USERNAME_HINT = "2–30 ตัว ใช้ภาษาไทย อังกฤษ ตัวเลข . _ - ได้ (ไม่มีช่องว่าง)";
export const PASSWORD_MIN = 6;
export const MAX_FAILED = 5;
export const LOCK_MINUTES = 5;

export function normalizeUsername(input: unknown): string {
  return typeof input === "string" ? input.normalize("NFC").trim().toLowerCase() : "";
}

export function usernameError(u: string): string | null {
  if (u.length < 2 || u.length > 30) return "ชื่อผู้ใช้ต้องยาว 2–30 ตัว";
  if (!/^[a-z0-9ก-๙._-]+$/u.test(u)) return "ชื่อผู้ใช้ใช้ได้แค่ภาษาไทย อังกฤษ ตัวเลข . _ - (ไม่มีช่องว่าง)";
  return null;
}

// New passwords only; existing 4-digit PINs keep working until changed.
export function passwordError(p: unknown): string | null {
  if (typeof p !== "string" || p.length < PASSWORD_MIN) return `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN} ตัว`;
  if (p.length > 72) return "รหัสผ่านยาวเกินไป";
  return null;
}

// Lock after too many wrong tries: returns the new counters to store.
export function afterFailure(failed: number, now: Date): { failed_attempts: number; locked_until: string | null } {
  const next = failed + 1;
  if (next >= MAX_FAILED) return { failed_attempts: 0, locked_until: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() };
  return { failed_attempts: next, locked_until: null };
}

export function lockedMinutesLeft(lockedUntil: string | null | undefined, now: Date): number {
  if (!lockedUntil) return 0;
  const ms = Date.parse(lockedUntil) - now.getTime();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}
