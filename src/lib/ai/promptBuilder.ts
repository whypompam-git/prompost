import { CONTEXT_KEYS } from "../aiContext.ts";
import type { Pattern } from "./patterns.ts";

export type StudioMode = "ideas" | "script";

const HEAD_LIMIT = 60;

export type RecentClip = { title: string; hook: string; cta: string };
export type TopicPlan = { angle: string; problem: string; gives: string };

// Rules + client context. Never includes `_admin` data (it is not stored on the web).
// content_history is replaced by what was actually done: title, hook and CTA of recent clips,
// so the model can see what the client has already heard.
export function buildStable(playbooks: { key: string; title: string; content: string }[], context: Record<string, string | undefined>, recent: RecentClip[]): string {
  const parts: string[] = ["คุณคือนักเขียนสคริปต์/นักวางแผนคอนเทนต์ของเอเจนซี่ \"พร้อมโพส\" ตอบเป็นภาษาไทย ทำตามกฎด้านล่างอย่างเคร่งครัด ห้ามแต่งข้อเท็จจริง/ตัวเลข/ราคา/ช่องทางติดต่อที่ไม่อยู่ในข้อมูลลูกค้า (ถ้าจำเป็นต้องใช้ ให้เขียนเป็น [ยืนยัน: …])"];
  for (const p of playbooks) parts.push(`# กฎ: ${p.title}\n${p.content}`);
  for (const k of CONTEXT_KEYS) {
    if (k.key === "content_history") continue;
    const c = context[k.key]?.trim();
    if (c) parts.push(`# ข้อมูลลูกค้า: ${k.label}\n${c}`);
  }
  const list = recent.slice(-HEAD_LIMIT);
  if (list.length) {
    parts.push(
      `# คลิปที่ทำไปแล้ว (ห้ามซ้ำหัวข้อ มุมเรื่อง ประโยคเปิด หรือ CTA เดิม)\n${list.map((r) => `- ${r.title}${r.hook ? ` | Hook: ${r.hook}` : ""}${r.cta ? ` | CTA: ${r.cta}` : ""}`).join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

export const HOOK_RULES = `กฎ Hook (3 วินาทีแรก — ถ้าไม่ดึง คนปัดทิ้ง):
- ยาวไม่เกิน 40 ตัวอักษร พูดจบใน 3 วินาที
- ต้องมีสิ่งเฉพาะของลูกค้านี้ (สินค้า/สถานการณ์/ตัวเลขจากข้อมูลลูกค้า) ฟังแล้วรู้ว่าเป็นเรื่องของใคร ไม่ใช่ประโยคที่ใช้กับใครก็ได้
- ห้ามขึ้นต้นด้วย: "รู้ไหมว่า", "รู้หรือไม่", "วันนี้มา…", "สวัสดี", "ใครที่กำลัง…", "ในคลิปนี้", "เคยไหม…"
- เริ่มที่ผลลัพธ์/ความเจ็บ/ความขัดแย้งทันที ไม่เกริ่น ไม่แนะนำตัว
- ต่อคลิป: เขียน Hook ทางเลือก 3 แบบ (hook_options) แล้วเลือกที่แรงสุดมาใช้ในบรรทัด A) และอธิบายเหตุผลสั้น ๆ (hook_reason)`;

export const CTA_RULES = `กฎ CTA (ท้ายคลิป):
- ทำได้ทีละอย่างเดียว: คำสั่งเดียวที่ชัด + (ถ้าเป็นคลิปขาย) ช่องทางจริงของลูกค้านี้
- ใช้ประเภท CTA ที่กำหนดให้แต่ละคลิปเท่านั้น ห้ามใช้ CTA ซ้ำกับคลิปที่ทำไปแล้ว หรือกับคลิปอื่นในชุด
- ช่องทางติดต่อ (ไลน์/เบอร์/ที่อยู่) ใช้ได้เฉพาะที่อยู่ในข้อมูลลูกค้า ถ้าไม่มีให้เขียน [ยืนยัน: ช่องทางติดต่อ]
- ห้ามเขียนลอย ๆ เช่น "ติดตามด้วยนะ" โดยไม่บอกเหตุผลที่ควรทำ ให้เชื่อมกับเรื่องของคลิป (เช่น "อยากได้สูตรเต็ม ทักไลน์มา")`;

const sellBlock = (lines: string[], head: string) => (lines.length ? `\n${head}\n${lines.map((x) => `- ${x}`).join("\n")}` : "");

// Pass 1 (cheap model): decide the TOPICS of the whole batch before any script is written.
export function buildTopicsPrompt(opts: { instruction: string; patterns: Pattern[]; category?: string; sellingLines: string[] }): string {
  const n = opts.patterns.length;
  const lines = opts.patterns.map((p, i) => `${i + 1}. ฟอร์แมต: ${p.format} | ประเภท Hook: ${p.hook}`).join("\n");
  return `วางหัวข้อคอนเทนต์ ${n} เรื่อง ยังไม่ต้องเขียนสคริปต์
แต่ละเรื่องต้องต่างกันจริงที่ "มุมเรื่อง" (ไม่ใช่แค่ต่างคำพูด) และต่างจากคลิปที่ทำไปแล้ว ระบุ:
- angle: มุมเรื่อง 1 ประโยค (ใครมีปัญหาอะไร / เรื่องอะไรที่ลูกค้าของลูกค้าอยากรู้)
- problem: ความเจ็บหรือคำถามของผู้ชมที่คลิปนี้แก้
- gives: สิ่งที่ผู้ชมได้ไปหลังดูจบ
เรียงตามลำดับต่อไปนี้ (ฟอร์แมต/ประเภท Hook ถูกกำหนดแล้ว ให้มุมเรื่องเหมาะกับมัน):
${lines}${opts.category ? `\nหมวดทุกคลิป: ${opts.category}` : ""}${sellBlock(opts.sellingLines, "ประโยคขายที่ต้องมีอยู่ในทุกคลิป (ใช้เป็นแกนคิดมุมเรื่อง):")}

คำสั่งเพิ่มเติม:
${opts.instruction.trim() || "(ไม่มี)"}

ส่งผลด้วยเครื่องมือ submit_topics เท่านั้น`;
}

export const TOPICS_TOOL = {
  name: "submit_topics",
  description: "ส่งหัวข้อของทั้งชุด",
  input_schema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: { angle: { type: "string" }, problem: { type: "string" }, gives: { type: "string" } },
          required: ["angle", "problem", "gives"],
        },
      },
    },
    required: ["topics"],
  },
};

export function parseTopics(input: unknown): TopicPlan[] {
  const t = (input as { topics?: unknown })?.topics;
  if (!Array.isArray(t)) return [];
  return t
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ angle: String(x.angle ?? "").trim(), problem: String(x.problem ?? "").trim(), gives: String(x.gives ?? "").trim() }))
    .filter((x) => x.angle);
}

export function buildVariable(
  mode: StudioMode,
  opts: { instruction: string; patterns: Pattern[]; category?: string; sellingLines: string[]; topics?: TopicPlan[] },
): string {
  const n = opts.patterns.length;
  const lines = opts.patterns
    .map((p, i) => {
      const t = opts.topics?.[i];
      const head = `${i + 1}. ฟอร์แมต: ${p.format} | ประเภท Hook: ${p.hook}${p.cta ? ` | CTA: ${p.cta}` : ""}`;
      return t ? `${head}\n   มุมเรื่อง (ล็อกแล้ว ห้ามเปลี่ยน): ${t.angle}\n   ปัญหาผู้ชม: ${t.problem}\n   ผู้ชมได้: ${t.gives}` : head;
    })
    .join("\n");
  const cat = opts.category ? `\nหมวดทุกคลิป: ${opts.category}` : "";
  const task =
    mode === "ideas"
      ? `คิดไอเดียคอนเทนต์ ${n} คลิป แต่ละคลิปให้ title (ชื่อสั้น) และ script เป็นโครงสั้น ๆ 3–5 บรรทัด (Hook, แก่นเรื่อง, CTA) ยังไม่ต้องเขียนบทเต็ม`
      : `เขียนสคริปต์เต็ม ${n} คลิป ความยาวพูด 50–60 วินาที (ตัวอักษรของบรรทัดพูด 🗣 รวมกับ Hook รวมกัน 600–750 ตัวอักษร) ตามรูปแบบเอาต์พุตในกฎ ใช้ 🗣 นำหน้าบรรทัดที่พูด และบรรทัด Hook ขึ้นต้น "A)" ส่วน CTA อยู่ท้ายคลิปใต้หัวข้อ CTA`;
  return `${task}

แต่ละคลิปต้องใช้ฟอร์แมต/ประเภท Hook/CTA ตามลำดับนี้ (ห้ามสลับ ห้ามซ้ำโครงกัน และคำเปิดต้องไม่เหมือนกัน):
${lines}${cat}${sellBlock(opts.sellingLines, "ประโยค/คีย์เวิร์ดขายที่ต้องแทรกในทุกคลิป (ต้นเรื่อง กลางเรื่อง และท้าย/CTA ให้ปรากฏอย่างเป็นธรรมชาติ):")}

${HOOK_RULES}

${CTA_RULES}

คำสั่งเพิ่มเติมจากผู้ใช้:
${opts.instruction.trim() || "(ไม่มี)"}

ส่งผลลัพธ์ด้วยเครื่องมือ submit_clips เท่านั้น`;
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
            hook_options: { type: "array", items: { type: "string" }, description: "Hook ทางเลือก 3 แบบ" },
            hook_reason: { type: "string", description: "ทำไมเลือก Hook ที่ใช้" },
          },
          required: ["title", "script", "hook_options"],
        },
      },
    },
    required: ["clips"],
  },
};

export type ParsedClip = { title: string; category: string; script: string; hookOptions: string[]; hookReason: string };

export function parseClips(input: unknown): ParsedClip[] {
  const clips = (input as { clips?: unknown })?.clips;
  if (!Array.isArray(clips)) return [];
  return clips
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => ({
      title: String(c.title ?? "").trim(),
      category: ["mass", "royalty", "sell"].includes(String(c.category)) ? String(c.category) : "",
      script: String(c.script ?? "").trim(),
      hookOptions: Array.isArray(c.hook_options) ? c.hook_options.map((h) => String(h).trim()).filter(Boolean).slice(0, 3) : [],
      hookReason: String(c.hook_reason ?? "").trim(),
    }))
    .filter((c) => c.title && c.script);
}
