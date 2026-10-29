import { CONTEXT_KEYS } from "../aiContext.ts";
import type { Pattern } from "./patterns.ts";

export type StudioMode = "ideas" | "script";

const HEAD_LIMIT = 150;

// Rules + client context. Never includes `_admin` data (it is not stored on the web) and sends only titles from content_history.
export function buildStable(playbooks: { key: string; title: string; content: string }[], context: Record<string, string | undefined>, existingTitles: string[]): string {
  const parts: string[] = ["คุณคือนักเขียนสคริปต์/นักวางแผนคอนเทนต์ของเอเจนซี่ \"พร้อมโพส\" ตอบเป็นภาษาไทย ทำตามกฎด้านล่างอย่างเคร่งครัด ห้ามแต่งข้อเท็จจริง/ตัวเลข/ราคาที่ไม่อยู่ในข้อมูลลูกค้า (ถ้าจำเป็นต้องใช้ ให้เขียนเป็น [ยืนยัน: …])"];
  for (const p of playbooks) parts.push(`# กฎ: ${p.title}\n${p.content}`);
  for (const k of CONTEXT_KEYS) {
    if (k.key === "content_history") continue;
    const c = context[k.key]?.trim();
    if (c) parts.push(`# ข้อมูลลูกค้า: ${k.label}\n${c}`);
  }
  const titles = existingTitles.slice(-HEAD_LIMIT);
  if (titles.length) parts.push(`# ชื่อคลิปที่ทำไปแล้ว (ห้ามซ้ำหัวข้อ/มุมเดิม)\n${titles.join("\n")}`);
  return parts.join("\n\n");
}

export function buildVariable(mode: StudioMode, opts: { instruction: string; patterns: Pattern[]; category?: string; queue?: string; sellingLines: string[]; startNumber?: number }): string {
  const n = opts.patterns.length;
  const lines = opts.patterns.map((p, i) => `${i + 1}. ฟอร์แมต: ${p.format} | ประเภท Hook: ${p.hook}`).join("\n");
  const sell = opts.sellingLines.length ? `\nประโยค/คีย์เวิร์ดขายที่ต้องแทรกในทุกคลิป (ต้นเรื่อง กลางเรื่อง และท้าย/CTA ให้ปรากฏอย่างเป็นธรรมชาติ):\n${opts.sellingLines.map((s) => `- ${s}`).join("\n")}` : "";
  const cat = opts.category ? `\nหมวดทุกคลิป: ${opts.category}` : "";
  const task =
    mode === "ideas"
      ? `คิดไอเดียคอนเทนต์ ${n} คลิป แต่ละคลิปให้ title (ชื่อสั้น) และ script เป็นโครงสั้น ๆ 3–5 บรรทัด (Hook, แก่นเรื่อง, CTA) ยังไม่ต้องเขียนบทเต็ม`
      : `เขียนสคริปต์เต็ม ${n} คลิป ความยาวพูด 50–60 วินาที (ตัวอักษรของบรรทัดพูด 🗣 รวมกับ Hook รวมกัน 600–750 ตัวอักษร) ตามรูปแบบเอาต์พุตในกฎ ใช้ 🗣 นำหน้าบรรทัดที่พูด และบรรทัด Hook ขึ้นต้น "A)"`;
  return `${task}\n\nแต่ละคลิปต้องใช้ฟอร์แมต/ประเภท Hook ตามลำดับนี้ (ห้ามสลับ ห้ามซ้ำโครงกัน และคำเปิดต้องไม่เหมือนกัน):\n${lines}${cat}${sell}\n\nคำสั่งเพิ่มเติมจากผู้ใช้:\n${opts.instruction.trim() || "(ไม่มี)"}\n\nส่งผลลัพธ์ด้วยเครื่องมือ submit_clips เท่านั้น`;
}

export const CLIPS_TOOL = {
  name: "submit_clips",
  description: "ส่งรายการคลิปที่สร้าง",
  input_schema: {
    type: "object",
    properties: {
      clips: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string", enum: ["mass", "royalty", "sell"] },
            script: { type: "string" },
          },
          required: ["title", "script"],
        },
      },
    },
    required: ["clips"],
  },
};

export function parseClips(input: unknown): { title: string; category: string; script: string }[] {
  const clips = (input as { clips?: unknown })?.clips;
  if (!Array.isArray(clips)) return [];
  return clips
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => ({ title: String(c.title ?? "").trim(), category: ["mass", "royalty", "sell"].includes(String(c.category)) ? String(c.category) : "", script: String(c.script ?? "").trim() }))
    .filter((c) => c.title && c.script);
}
