// Pure rules for Workspace IDs (shared by API routes, UI and tests).

export const HANDLE_HINT = "3–30 ตัว ภาษาอังกฤษตัวเล็ก ตัวเลข และ - เช่น my-agency";

// words that would be confusing as a workspace's ID
const RESERVED = new Set(["admin", "api", "app", "www", "login", "signup", "welcome", "settings", "support", "help", "root", "system", "new"]);

export function normalizeHandle(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export function handleError(h: string): string | null {
  if (h.length < 3 || h.length > 30) return "Workspace ID ต้องยาว 3–30 ตัว";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(h)) return "ใช้ได้แค่ภาษาอังกฤษตัวเล็ก ตัวเลข และ - (ไม่ขึ้นต้น/ลงท้ายด้วย -)";
  if (RESERVED.has(h)) return "ชื่อนี้สงวนไว้ ลองชื่ออื่น";
  return null;
}

export function workspaceNameError(n: unknown): string | null {
  if (typeof n !== "string" || n.trim().length < 2) return "ตั้งชื่อ Workspace อย่างน้อย 2 ตัวอักษร";
  if (n.trim().length > 60) return "ชื่อยาวเกินไป";
  return null;
}
