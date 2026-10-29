// Automatic checks for client scripts (AI Studio phase 2). Pure functions, no
// I/O, unit-tested. They back both the "check & save" page and (later) the
// AI generator's retry loop.
//
//  length   — spoken text (🗣 lines + hook A) vs the 50–60 s target (ported from _tools/script-length.mjs)
//  keywords — the client's selling lines must appear, spread over the clip
//  variety  — scripts must not loop: similar hooks / CTAs / bodies are flagged
//  facts    — numbers in the spoken text that are not in the client's context

export type Level = "pass" | "warn" | "fail";

const clean = (s: string) => s.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").replace(/[*_`"“”'‘’]/g, "").replace(/\s+/g, "");

// everything that is said out loud: lines that start with 🗣, plus hook option A
export function extractSpeech(script: string): { spoken: string; hook: string; lines: string[] } {
  let hook = "";
  const lines: string[] = [];
  for (const raw of script.split("\n")) {
    const l = raw.trim();
    if (l.startsWith("🗣")) lines.push(l.replace(/^🗣\s*(พูด:|พูด)?/, "").trim());
    else if (/^A\)\s*/.test(l) && !hook) hook = l.replace(/^A\)\s*/, "");
  }
  return { spoken: lines.join(" "), hook, lines };
}

export type LengthReport = { level: Level; chars: number; seconds: number; secondsRange: [number, number]; hasSpoken: boolean; message: string };

export function checkLength(script: string, min = 600, max = 750): LengthReport {
  const { spoken, hook } = extractSpeech(script);
  const chars = clean(hook + spoken).length;
  const seconds = Math.round(chars / 12);
  const secondsRange: [number, number] = [Math.round(chars / 14), Math.round(chars / 10)];
  if (spoken.length === 0) return { level: "fail", chars, seconds, secondsRange, hasSpoken: false, message: "ไม่พบบรรทัด 🗣 — ยังไม่ใช่บทพูดเต็ม" };
  if (chars < min) return { level: "fail", chars, seconds, secondsRange, hasSpoken: true, message: `สั้นไป ${chars} ตัวอักษร (≈${seconds} วิ) ต้องการ ${min}–${max}` };
  if (chars > max) return { level: "warn", chars, seconds, secondsRange, hasSpoken: true, message: `ยาวไป ${chars} ตัวอักษร (≈${seconds} วิ) ต้องการ ${min}–${max}` };
  return { level: "pass", chars, seconds, secondsRange, hasSpoken: true, message: `${chars} ตัวอักษร ≈ ${seconds} วิ` };
}

// ---- key phrases ---------------------------------------------------------
const norm = (s: string) => s.replace(/[\s"'“”‘’.,!?…()\-–—:;/]/g, "").toLowerCase();

// "selling_lines" context: one phrase per line. A quoted part is the phrase
// ("เนื้อสดใหม่ทุกวัน" (ต้องมีใน CTA)); otherwise the text before a "(" note.
export function parseSellingLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    let l = raw.trim();
    if (!l || l.startsWith("#") || l.startsWith(">") || l.startsWith("<!--")) continue;
    l = l.replace(/^[-*•\d.)\s]+/, "").trim();
    if (!l) continue;
    const q = /["“]([^"”]+)["”]/.exec(l);
    const phrase = (q ? q[1] : l.replace(/\s*[(（].*$/, "")).trim();
    if (phrase.length >= 3) out.push(phrase);
  }
  return [...new Set(out)];
}

export type KeywordReport = {
  level: Level;
  required: number;
  found: string[];
  missing: string[];
  spread: { start: boolean; middle: boolean; end: boolean };
  message: string;
};

export function checkKeywords(script: string, phrases: string[]): KeywordReport {
  const { spoken, hook } = extractSpeech(script);
  const text = norm(hook + spoken);
  const found: string[] = [];
  const missing: string[] = [];
  const spread = { start: false, middle: false, end: false };
  const third = Math.max(1, Math.floor(text.length / 3));
  for (const p of phrases) {
    const n = norm(p);
    const at = n ? text.indexOf(n) : -1;
    if (at < 0) {
      missing.push(p);
      continue;
    }
    found.push(p);
    for (let i = at; i !== -1 && i < text.length; i = text.indexOf(n, i + 1)) {
      if (i < third) spread.start = true;
      else if (i < third * 2) spread.middle = true;
      else spread.end = true;
    }
  }
  if (phrases.length === 0) return { level: "pass", required: 0, found, missing, spread, message: "ยังไม่ได้ตั้งคีย์เวิร์ดของลูกค้า" };
  if (missing.length > 0) return { level: "fail", required: phrases.length, found, missing, spread, message: `ขาดประโยคขาย ${missing.length}/${phrases.length}: ${missing.map((m) => `"${m}"`).join(" ")}` };
  const holes = (["start", "middle", "end"] as const).filter((k) => !spread[k]);
  if (holes.length > 0) {
    const names = { start: "ช่วงต้น", middle: "ช่วงกลาง", end: "ช่วงท้าย/CTA" };
    return { level: "warn", required: phrases.length, found, missing, spread, message: `มีครบแต่ไม่กระจาย — ไม่มีคีย์เวิร์ดใน${holes.map((h) => names[h]).join(", ")}` };
  }
  return { level: "pass", required: phrases.length, found, missing, spread, message: `แทรกครบ ${found.length}/${phrases.length} และกระจายทั้งต้น-กลาง-ท้าย` };
}

// ---- variety (anti-loop) -------------------------------------------------
function grams(s: string, n = 3): Set<string> {
  const t = norm(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= t.length; i++) out.add(t.slice(i, i + n));
  return out;
}
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export type ScriptItem = { id: string; title: string; script: string };
export type Conflict = { withId: string; withTitle: string; kind: "hook" | "cta" | "body"; score: number };
export const VARIETY_LIMITS = { hook: 0.55, cta: 0.7, body: 0.4 };

function fingerprint(script: string) {
  const { spoken, hook, lines } = extractSpeech(script);
  const cta = lines.length ? lines[lines.length - 1] : "";
  return { hook: grams(hook), cta: grams(cta), body: grams(spoken), hookStart: norm(hook).slice(0, 8) };
}

// Compares every script with the others in the batch and with `existing`
// (the client's earlier clips). Returns conflicts per script id.
export function checkVariety(items: ScriptItem[], existing: ScriptItem[] = []): Record<string, { level: Level; conflicts: Conflict[]; message: string }> {
  const all = [...items.map((i) => ({ ...i, mine: true })), ...existing.map((i) => ({ ...i, mine: false }))];
  const fp = new Map(all.map((i) => [i.id, fingerprint(i.script)]));
  const out: Record<string, { level: Level; conflicts: Conflict[]; message: string }> = {};
  for (const it of items) {
    const a = fp.get(it.id)!;
    const conflicts: Conflict[] = [];
    for (const other of all) {
      if (other.id === it.id) continue;
      const b = fp.get(other.id)!;
      const hook = jaccard(a.hook, b.hook);
      const cta = jaccard(a.cta, b.cta);
      const body = jaccard(a.body, b.body);
      const sameStart = a.hookStart.length >= 8 && a.hookStart === b.hookStart;
      if (hook >= VARIETY_LIMITS.hook || sameStart) conflicts.push({ withId: other.id, withTitle: other.title, kind: "hook", score: sameStart ? 1 : hook });
      else if (body >= VARIETY_LIMITS.body) conflicts.push({ withId: other.id, withTitle: other.title, kind: "body", score: body });
      if (cta >= VARIETY_LIMITS.cta) conflicts.push({ withId: other.id, withTitle: other.title, kind: "cta", score: cta });
    }
    const kinds = new Set(conflicts.map((c) => c.kind));
    const label = { hook: "Hook", cta: "CTA", body: "เนื้อหา" };
    out[it.id] = conflicts.length
      ? { level: kinds.has("body") || conflicts.filter((c) => c.kind === "hook").length >= 2 ? "fail" : "warn", conflicts, message: `คล้าย: ${[...new Set(conflicts.map((c) => `${label[c.kind]} ↔ ${c.withTitle}`))].slice(0, 3).join(" · ")}` }
      : { level: "pass", conflicts, message: "ไม่ซ้ำกับคลิปอื่น" };
  }
  // the same opening used by 3+ clips of the batch is a pattern even when each pair is under the limit
  const starts = new Map<string, string[]>();
  for (const it of items) {
    const s = fp.get(it.id)!.hookStart;
    if (s.length >= 6) starts.set(s, [...(starts.get(s) ?? []), it.id]);
  }
  for (const ids of starts.values()) {
    if (ids.length >= 3) for (const id of ids) if (out[id].level === "pass") out[id] = { level: "warn", conflicts: out[id].conflicts, message: `เปิดเรื่องเหมือนกัน ${ids.length} คลิปในชุด` };
  }
  return out;
}

// ---- facts ----------------------------------------------------------------
// numbers said out loud (≥3 digits, e.g. a price) that do not appear anywhere in the client context
export function checkFacts(script: string, context: string): { level: Level; unknown: string[]; message: string } {
  const spoken = extractSpeech(script).lines.join(" ").replace(/\[[^\]]*\]/g, "");
  const ctx = context.replace(/,/g, "");
  const nums = [...new Set((spoken.replace(/,/g, "").match(/\d{3,}(?:\.\d+)?/g) ?? []))];
  const unknown = nums.filter((n) => !ctx.includes(n));
  return unknown.length
    ? { level: "warn", unknown, message: `ตัวเลขที่ไม่พบใน context: ${unknown.join(", ")} (ยืนยันกับลูกค้า หรือใส่ในรูป [ยืนยัน…])` }
    : { level: "pass", unknown, message: "ไม่มีตัวเลขที่ไม่รู้ที่มา" };
}

// ---- titles ----------------------------------------------------------------
// next "<queue>.<NN>" title for a client: 3 + titles 3.01 3.02 → 3.03
export function nextTitleNumber(existingTitles: string[], queue: string): string {
  const q = queue.trim();
  const re = new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(\\d{2,})\\b`);
  let max = 0;
  for (const t of existingTitles) {
    const m = re.exec(t.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${q}.${String(max + 1).padStart(2, "0")}`;
}

export const worst = (levels: Level[]): Level => (levels.includes("fail") ? "fail" : levels.includes("warn") ? "warn" : "pass");
