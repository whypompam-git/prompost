// Validation for the token-protected /api/ai/* endpoints (used by the Claude
// workspace tools that draft content and load tasks). Pure — see tests/aiApi.test.ts.

export const TASK_TYPES = ["shoot", "edit", "review", "deliver", "other"];
export const TASK_STATUSES = ["todo", "in_progress", "review", "done"];
export const TASK_CATEGORIES = ["mass", "royalty", "sell"];

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isStringArray = (v: unknown, max = 100, len = 500): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === "string" && x.length <= len);
export const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export type NewTaskInput = {
  title: string;
  type?: string;
  status?: string;
  category?: string | null;
  scheduledDate: string;
  dueDate: string;
  script?: string | null;
  shots?: string[];
  equipment?: string[];
  notes?: string | null;
  refLink?: string | null;
  postDate?: string | null;
};

export type NewTaskRow = {
  title: string;
  type: string;
  status: string;
  assignee_id: null;
  scheduled_date: string;
  due_date: string;
  notes: string | null;
  ref_link: string | null;
  content_category: string | null;
  script_text: string | null;
  shots: string[];
  equipment: string[];
  post_date: string | null;
};

export function validateNewTasks(input: unknown): { ok: true; rows: NewTaskRow[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, errors: ["tasks ต้องเป็น array ที่ไม่ว่าง"] };
  if (input.length > 200) return { ok: false, errors: ["ส่งได้ครั้งละไม่เกิน 200 งาน"] };
  const errors: string[] = [];
  const rows: NewTaskRow[] = [];
  input.forEach((raw, i) => {
    const t = (raw ?? {}) as Record<string, unknown>;
    const w = `งานที่ ${i + 1} (${typeof t.title === "string" ? t.title : "ไม่มีชื่อ"})`;
    if (typeof t.title !== "string" || !t.title.trim() || t.title.length > 300) errors.push(`${w}: title ไม่ถูกต้อง`);
    const type = (t.type ?? "other") as string;
    const status = (t.status ?? "todo") as string;
    if (!TASK_TYPES.includes(type)) errors.push(`${w}: type ไม่ถูกต้อง`);
    if (!TASK_STATUSES.includes(status)) errors.push(`${w}: status ไม่ถูกต้อง`);
    if (t.category != null && !TASK_CATEGORIES.includes(t.category as string)) errors.push(`${w}: category ต้องเป็น mass|royalty|sell`);
    if (!isDate(t.scheduledDate) || !isDate(t.dueDate)) errors.push(`${w}: scheduledDate/dueDate ต้องเป็น YYYY-MM-DD`);
    if (t.postDate != null && !isDate(t.postDate)) errors.push(`${w}: postDate ต้องเป็น YYYY-MM-DD`);
    if (t.script != null && (typeof t.script !== "string" || t.script.length > 50_000)) errors.push(`${w}: script ยาวเกิน/ไม่ใช่ข้อความ`);
    if (t.notes != null && (typeof t.notes !== "string" || t.notes.length > 5_000)) errors.push(`${w}: notes ยาวเกิน/ไม่ใช่ข้อความ`);
    if (t.refLink != null && (typeof t.refLink !== "string" || t.refLink.length > 1_000)) errors.push(`${w}: refLink ไม่ถูกต้อง`);
    if (t.shots != null && !isStringArray(t.shots)) errors.push(`${w}: shots ต้องเป็น array ของข้อความ`);
    if (t.equipment != null && !isStringArray(t.equipment)) errors.push(`${w}: equipment ต้องเป็น array ของข้อความ`);
    if (errors.length === 0 || !errors.some((e) => e.startsWith(w))) {
      rows.push({
        title: (t.title as string).trim(),
        type,
        status,
        assignee_id: null,
        scheduled_date: t.scheduledDate as string,
        due_date: t.dueDate as string,
        notes: (t.notes as string) || null,
        ref_link: (t.refLink as string) || null,
        content_category: (t.category as string) || null,
        script_text: (t.script as string) || null,
        shots: (t.shots as string[]) ?? [],
        equipment: (t.equipment as string[]) ?? [],
        post_date: (t.postDate as string) || null,
      });
    }
  });
  const titles = rows.map((r) => r.title);
  if (new Set(titles).size !== titles.length) errors.push("มีชื่องานซ้ำกันภายในชุดที่ส่ง");
  return errors.length ? { ok: false, errors } : { ok: true, rows };
}

// Only these task columns can be changed through the AI API. status, assignee,
// client and deletion are deliberately not on the list.
const PATCH_TEXT = new Set(["title", "script_text", "notes", "ref_link"]);
const PATCH_DATE = new Set(["scheduled_date", "due_date", "post_date"]);
const PATCH_ARRAY = new Set(["shots", "equipment"]);
export const EXPECT_KEYS = new Set(["title", "script_text", "notes", "ref_link", "scheduled_date", "due_date"]);

export function sanitizePatch(patch: unknown): { ok: true; patch: Record<string, unknown> } | { ok: false; error: string } {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { ok: false, error: "patch ต้องเป็น object" };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (PATCH_TEXT.has(k)) {
      const limit = k === "script_text" ? 50_000 : k === "title" ? 300 : 5_000;
      if (v !== null && (typeof v !== "string" || v.length > limit)) return { ok: false, error: `${k} ไม่ถูกต้อง` };
      if (k === "title" && (typeof v !== "string" || !v.trim())) return { ok: false, error: "title ห้ามว่าง" };
      out[k] = v;
    } else if (PATCH_DATE.has(k)) {
      if (k === "post_date" ? v !== null && !isDate(v) : !isDate(v)) return { ok: false, error: `${k} ต้องเป็น YYYY-MM-DD` };
      out[k] = v;
    } else if (PATCH_ARRAY.has(k)) {
      if (!isStringArray(v)) return { ok: false, error: `${k} ต้องเป็น array ของข้อความ` };
      out[k] = v;
    } else if (k === "content_category") {
      if (v !== null && !TASK_CATEGORIES.includes(v as string)) return { ok: false, error: "content_category ไม่ถูกต้อง" };
      out[k] = v;
    } else {
      return { ok: false, error: `ไม่อนุญาตให้แก้คอลัมน์ "${k}"` };
    }
  }
  if (Object.keys(out).length === 0) return { ok: false, error: "patch ว่าง" };
  return { ok: true, patch: out };
}

export function sanitizeExpect(expect: unknown): { ok: true; expect: Record<string, string | null> } | { ok: false; error: string } {
  if (expect == null) return { ok: true, expect: {} };
  if (typeof expect !== "object" || Array.isArray(expect)) return { ok: false, error: "expect ต้องเป็น object" };
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(expect as Record<string, unknown>)) {
    if (!EXPECT_KEYS.has(k)) return { ok: false, error: `expect ไม่รองรับคอลัมน์ "${k}"` };
    if (v !== null && typeof v !== "string") return { ok: false, error: `expect.${k} ต้องเป็นข้อความหรือ null` };
    out[k] = v;
  }
  return { ok: true, expect: out };
}
