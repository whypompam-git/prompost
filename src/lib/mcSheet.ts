// Pure helpers for syncing MC profiles from a Google Sheet (a Tally responses
// export). No I/O here so it is unit-tested; the fetching/upserting lives in
// mcSync.ts.

// RFC-4180 CSV: quoted fields, "" escapes, newlines inside quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// "https://docs.google.com/spreadsheets/d/<id>/edit?gid=123#gid=123" → CSV export URL
export function sheetCsvUrl(sheetUrl: string): string | null {
  const id = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(sheetUrl)?.[1];
  if (!id) return null;
  const gid = /[?#&]gid=(\d+)/.exec(sheetUrl)?.[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}

export type McSource = {
  source_id: string;
  submitted_at: string | null;
  prefix: string | null;
  full_name: string | null;
  nickname: string | null;
  age: string | null;
  height: string | null;
  weight: string | null;
  sheet_rate: string | null;
  phone: string | null;
  line_id: string | null;
  ig: string | null;
  facebook: string | null;
  character: string | null;
  skills: string | null;
  experience: string | null;
  portfolio: string | null;
  photo_source: string | null;
};

// header text (as it appears in the sheet) → field. Matched by "contains", so
// small wording changes in the form keep working.
const COLUMNS: { field: keyof McSource; match: RegExp }[] = [
  { field: "source_id", match: /^submission id$/i },
  { field: "submitted_at", match: /^submitted at$/i },
  { field: "photo_source", match: /รูปโปรไฟล์|profile/i },
  { field: "prefix", match: /คำนำหน้า/ },
  { field: "full_name", match: /ชื่อจริง|นามสกุล/ },
  { field: "nickname", match: /ชื่อเล่น/ },
  { field: "age", match: /^อายุ/ },
  { field: "height", match: /ส่วนสูง/ },
  { field: "weight", match: /น้ำหนัก/ },
  { field: "sheet_rate", match: /เรทราคา|rate/i },
  { field: "phone", match: /เบอร์โทร/ },
  { field: "line_id", match: /line\s*id/i },
  { field: "ig", match: /\big\b|instagram/i },
  { field: "facebook", match: /facebook/i },
  { field: "character", match: /คาแรคเตอร์|สไตล์/ },
  { field: "skills", match: /ความสามารถ/ },
  { field: "experience", match: /ประสบการณ์/ },
  { field: "portfolio", match: /ผลงาน/ },
];

const clean = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

export const firstUrl = (v: string | null | undefined) => /https?:\/\/[^\s,)"']+/.exec(v ?? "")?.[0] ?? null;

export function mapSheet(rows: string[][]): { profiles: McSource[]; missing: string[] } {
  if (rows.length === 0) return { profiles: [], missing: ["(ชีตว่าง)"] };
  const header = rows[0].map((h) => h.trim());
  const cols = new Map<keyof McSource, number[]>();
  for (const { field, match } of COLUMNS) {
    const idx = header.map((h, i) => (match.test(h) ? i : -1)).filter((i) => i >= 0);
    if (idx.length) cols.set(field, idx);
  }
  const missing = ["source_id", "nickname"].filter((f) => !cols.has(f as keyof McSource));
  if (missing.length) return { profiles: [], missing };

  const profiles = rows.slice(1).flatMap((r) => {
    const pick = (f: keyof McSource) => {
      for (const i of cols.get(f) ?? []) {
        const v = clean(r[i]);
        if (v) return v; // duplicate columns (e.g. two Facebook columns): first filled wins
      }
      return null;
    };
    const source_id = pick("source_id");
    if (!source_id) return [];
    const submitted = pick("submitted_at");
    // "2026-10-01 9:05:00" (single-digit hours are common) → a valid ISO time
    const m = submitted ? /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(submitted) : null;
    const t = m ? new Date(`${m[1]}T${m[2].padStart(2, "0")}:${m[3]}:${m[4] ?? "00"}Z`) : null;
    return [
      {
        source_id,
        submitted_at: t && !Number.isNaN(t.getTime()) ? t.toISOString() : null,
        prefix: pick("prefix"),
        full_name: pick("full_name"),
        nickname: pick("nickname"),
        age: pick("age"),
        height: pick("height"),
        weight: pick("weight"),
        sheet_rate: pick("sheet_rate"),
        phone: pick("phone"),
        line_id: pick("line_id"),
        ig: pick("ig"),
        facebook: pick("facebook"),
        character: pick("character"),
        skills: pick("skills"),
        experience: pick("experience"),
        portfolio: pick("portfolio"),
        photo_source: firstUrl(pick("photo_source")),
      },
    ];
  });
  return { profiles, missing: [] };
}

// Which fields a client-facing proposal may show. Real name, phone and Line ID
// are never part of this list — they cannot be turned on for clients.
export const CLIENT_FIELDS = [
  { key: "age", label: "อายุ" },
  { key: "height", label: "ส่วนสูง" },
  { key: "weight", label: "น้ำหนัก" },
  { key: "character", label: "คาแรคเตอร์/สไตล์" },
  { key: "skills", label: "ความสามารถพิเศษ" },
  { key: "experience", label: "ประสบการณ์" },
  { key: "portfolio", label: "ลิงก์ผลงาน" },
  { key: "ig", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "rate", label: "ราคาเสนอ" },
] as const;
export type ClientFieldKey = (typeof CLIENT_FIELDS)[number]["key"];
export const DEFAULT_CLIENT_SHOW: Record<ClientFieldKey, boolean> = {
  age: true, height: true, weight: false, character: true, skills: true, experience: true, portfolio: true, ig: true, facebook: true, rate: true,
};
