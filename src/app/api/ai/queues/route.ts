import { NextResponse } from "next/server";
import { requireAiToken } from "@/lib/aiAuth";
import { isUuid } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const crewOk = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 30 && v.every(isUuid);

// Shoot queues ("คิว1") for the Claude workspace. Create and edit only — no
// delete (clips would silently lose their queue). Look clients up by slug.
//   POST  { clientSlug, name, shootDate?, editDate?, crew?: [staffId], note? }
//   PATCH { updates: [{ id, patch: { name?, shoot_date?, edit_date?, crew?, note? } }] }
export async function POST(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const b = await request.json().catch(() => ({}));
  if (typeof b.clientSlug !== "string" || typeof b.name !== "string" || !b.name.trim() || b.name.length > 100) {
    return NextResponse.json({ error: "ต้องมี clientSlug และ name" }, { status: 400 });
  }
  if (b.shootDate != null && !isDate(b.shootDate)) return NextResponse.json({ error: "shootDate ต้องเป็น YYYY-MM-DD" }, { status: 400 });
  if (b.editDate != null && !isDate(b.editDate)) return NextResponse.json({ error: "editDate ต้องเป็น YYYY-MM-DD" }, { status: 400 });
  if (b.crew != null && !crewOk(b.crew)) return NextResponse.json({ error: "crew ต้องเป็น array ของ staff uuid" }, { status: 400 });
  if (b.note != null && (typeof b.note !== "string" || b.note.length > 1000)) return NextResponse.json({ error: "note ไม่ถูกต้อง" }, { status: 400 });

  const db = createAdminClient();
  const { data: clients } = await db.from("clients").select("id").eq("slug", b.clientSlug);
  if (clients?.length !== 1) return NextResponse.json({ error: `หาลูกค้า slug "${b.clientSlug}" ไม่พบ/ซ้ำ` }, { status: 404 });
  const clientId = clients[0].id;
  const { data: dup } = await db.from("queues").select("id").eq("client_id", clientId).eq("name", b.name.trim());
  if (dup?.length) return NextResponse.json({ error: "มีคิวชื่อนี้อยู่แล้ว", id: dup[0].id }, { status: 409 });

  const { data, error } = await db
    .from("queues")
    .insert({ client_id: clientId, name: b.name.trim(), shoot_date: b.shootDate ?? null, edit_date: b.editDate ?? null, crew: b.crew ?? [], note: b.note ?? null })
    .select("id, name, shoot_date, edit_date, crew, note")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: data });
}

export async function PATCH(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const b = await request.json().catch(() => ({}));
  if (!Array.isArray(b.updates) || b.updates.length === 0 || b.updates.length > 100) {
    return NextResponse.json({ error: "updates ต้องเป็น array 1–100 รายการ" }, { status: 400 });
  }
  const db = createAdminClient();
  const results: { id: string; updated: boolean; error?: string }[] = [];
  for (const [i, raw] of b.updates.entries()) {
    const u = (raw ?? {}) as { id?: unknown; patch?: Record<string, unknown> };
    const p = u.patch ?? {};
    const out: Record<string, unknown> = {};
    let bad = "";
    if (!isUuid(u.id)) bad = "id ไม่ถูกต้อง";
    for (const [k, v] of Object.entries(p)) {
      if (k === "name" && typeof v === "string" && v.trim() && v.length <= 100) out.name = v.trim();
      else if (k === "shoot_date" && (v === null || isDate(v))) out.shoot_date = v;
      else if (k === "edit_date" && (v === null || isDate(v))) out.edit_date = v;
      else if (k === "crew" && crewOk(v)) out.crew = v;
      else if (k === "note" && (v === null || (typeof v === "string" && v.length <= 1000))) out.note = v;
      else bad = `ไม่อนุญาต/ไม่ถูกต้อง: ${k}`;
    }
    if (!bad && Object.keys(out).length === 0) bad = "patch ว่าง";
    if (bad) {
      results.push({ id: String(u.id ?? i), updated: false, error: bad });
      continue;
    }
    const { data, error } = await db.from("queues").update(out).eq("id", u.id as string).select("id");
    results.push(error ? { id: u.id as string, updated: false, error: error.message } : { id: u.id as string, updated: (data ?? []).length === 1 });
  }
  return NextResponse.json({ results });
}
