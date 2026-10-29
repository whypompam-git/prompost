// Format × hook-type per clip is assigned by code, not left to the model, so a batch never loops on one pattern.
export const FORMATS = ["Talking head", "Story เล่าเรื่อง", "Q&A ตอบคำถาม", "Skit/สถานการณ์", "รีวิว/โชว์ของ", "เปรียบเทียบ ก่อน-หลัง", "เบื้องหลัง/Behind the scene", "Myth vs Fact"] as const;
export const HOOK_TYPES = ["คำถามจี้ใจ", "ตัวเลขช็อก", "เล่าเหตุการณ์จริง", "ทลายความเชื่อผิด", "ขัดความคาดหมาย", "คำสั่ง/เตือนตรง ๆ", "สารภาพ", "ลิสต์ข้อ"] as const;

export type Pattern = { format: string; hook: string };

// Deterministic: the pair (format, hook) never repeats inside a batch (up to 64 clips) and two neighbours never share a format or hook.
// `offset` rotates the start so a new batch does not begin with the same pair as the last one.
export function assignPatterns(count: number, offset = 0): Pattern[] {
  const out: Pattern[] = [];
  for (let i = 0; i < count; i++) {
    const n = i + offset;
    const format = FORMATS[n % FORMATS.length];
    const hook = HOOK_TYPES[(n + Math.floor(n / FORMATS.length) + 3 * (n % 2)) % HOOK_TYPES.length];
    out.push({ format, hook });
  }
  return out;
}
