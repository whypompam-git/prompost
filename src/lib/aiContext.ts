// Client context + writing rules ("playbooks") used by the AI Studio. Pure
// helpers (validation, file-name mapping, completeness) shared by the API
// endpoint, the import tool and the editing pages.

export const CONTEXT_KEYS = [
  { key: "profile", label: "โปรไฟล์ลูกค้า", file: "profile.md", core: true },
  { key: "brand_brief", label: "แบรนด์บรีฟ", file: "brand-brief.md", core: true },
  { key: "brand_voice", label: "น้ำเสียงแบรนด์ (สรรพนาม/คำลงท้าย/โทน)", file: "brand-voice.md", core: true },
  { key: "audience_offers", label: "กลุ่มเป้าหมาย & ข้อเสนอ", file: "audience-offers.md", core: true },
  { key: "content_pillars", label: "เสาหลักคอนเทนต์", file: "content-pillars.md", core: true },
  { key: "selling_lines", label: "คีย์เวิร์ด & ประโยคขายที่ต้องแทรกในสคริปต์", file: "selling-lines.md", core: true },
  { key: "notes_log", label: "บันทึกคุยลูกค้า/ข้อเปลี่ยนแปลงล่าสุด", file: "notes-log.md", core: false },
  { key: "content_history", label: "ประวัติคอนเทนต์ที่เคยทำ", file: "content-history.md", core: false },
  { key: "personal_brand", label: "Personal Brand 9x9", file: "personal-brand-9x9.md", core: false },
  { key: "direction", label: "แนวคอนเทนต์ที่ลูกค้าส่งมาเอง", file: "client-content-direction.md", core: false },
] as const;

export type ContextKey = (typeof CONTEXT_KEYS)[number]["key"];
export const CONTEXT_KEY_SET = new Set<string>(CONTEXT_KEYS.map((k) => k.key));
export const MAX_CONTEXT_CHARS = 300_000;

// folder file name → key; _admin.md (tax id, address, payment status) is never imported
export function keyForFile(fileName: string): ContextKey | null {
  const hit = CONTEXT_KEYS.find((k) => k.file === fileName);
  return hit ? hit.key : null;
}

// a file that is still the empty template carries no information
export function isTemplateOnly(content: string): boolean {
  const t = content.replace(/<!--[\s\S]*?-->/g, "").replace(/[#>*\-\s]/g, "");
  return t.length < 20;
}

export function validateContextMap(raw: unknown): { ok: true; map: Record<string, string> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "contexts ต้องเป็น object" };
  const map: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!CONTEXT_KEY_SET.has(k)) return { ok: false, error: `ไม่รู้จักหัวข้อ "${k}"` };
    if (typeof v !== "string" || v.length > MAX_CONTEXT_CHARS) return { ok: false, error: `${k} ต้องเป็นข้อความไม่เกิน ${MAX_CONTEXT_CHARS} ตัวอักษร` };
    map[k] = v;
  }
  return { ok: true, map };
}

export const PLAYBOOK_KEY = /^[a-z0-9][a-z0-9_-]{1,59}$/;

export function validatePlaybooks(raw: unknown): { ok: true; items: { key: string; title: string; content: string }[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) return { ok: false, error: "playbooks ต้องเป็น array 1–50 รายการ" };
  const items = [];
  for (const p of raw as Record<string, unknown>[]) {
    if (typeof p?.key !== "string" || !PLAYBOOK_KEY.test(p.key)) return { ok: false, error: `key ไม่ถูกต้อง: ${String(p?.key)}` };
    if (typeof p.title !== "string" || !p.title.trim() || p.title.length > 200) return { ok: false, error: `${p.key}: title ไม่ถูกต้อง` };
    if (typeof p.content !== "string" || p.content.length > MAX_CONTEXT_CHARS) return { ok: false, error: `${p.key}: content ไม่ถูกต้อง/ยาวเกิน` };
    items.push({ key: p.key, title: p.title.trim(), content: p.content });
  }
  return { ok: true, items };
}

// which core sections are still empty — shown as "ช่องว่าง" before generating
export function contextGaps(map: Record<string, string | undefined>): string[] {
  return CONTEXT_KEYS.filter((k) => k.core && isTemplateOnly(map[k.key] ?? "")).map((k) => k.label);
}
