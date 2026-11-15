// Pure rules for the client-link PIN.
export const PORTAL_PIN_MAX_FAILS = 5;
export const PORTAL_PIN_LOCK_MINUTES = 15;

export function portalPinError(pin: unknown): string | null {
  return typeof pin === "string" && /^\d{4,6}$/.test(pin) ? null : "PIN ต้องเป็นตัวเลข 4–6 หลัก";
}

// cookie names can't carry every character; client ids are uuids
export const portalCookieName = (clientId: string) => `pp_pin_${clientId.replace(/[^a-f0-9]/gi, "")}`;
