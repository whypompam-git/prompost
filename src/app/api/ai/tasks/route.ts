import { NextResponse } from "next/server";
import { requireAiToken } from "@/lib/aiAuth";
import { isUuid, sanitizeExpect, sanitizePatch, validateNewTasks } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const READ_COLUMNS = "id, client_id, title, script_text, notes, shots, equipment, scheduled_date, due_date, status, ref_link, content_category, post_date";

// Read specific tasks: ?ids=a,b,c (max 200)
export async function GET(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0 || ids.length > 200 || !ids.every(isUuid)) {
    return NextResponse.json({ error: "ids ต้องเป็น uuid คั่นด้วย , (1–200 ตัว)" }, { status: 400 });
  }
  const { data, error } = await createAdminClient().from("tasks").select(READ_COLUMNS).in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

// Create a batch for one client (looked up by slug). INSERT only. Refuses the
// whole batch if any title already exists for that client. dryRun=true
// validates and returns the plan without writing.
export async function POST(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const slug = body.clientSlug;
  if (typeof slug !== "string" || !slug) return NextResponse.json({ error: "ต้องมี clientSlug" }, { status: 400 });

  const checked = validateNewTasks(body.tasks);
  if (!checked.ok) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: checked.errors }, { status: 400 });

  const db = createAdminClient();
  const { data: clients, error: clientError } = await db.from("clients").select("id, name, slug").eq("slug", slug);
  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
  if (clients?.length !== 1) {
    return NextResponse.json({ error: `หาลูกค้า slug "${slug}" ได้ ${clients?.length ?? 0} ราย (ต้องได้ 1)` }, { status: 404 });
  }
  const client = clients[0];

  const { data: existing, error: existingError } = await db.from("tasks").select("id, title").eq("client_id", client.id);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const titles = new Set(checked.rows.map((r) => r.title));
  const dup = (existing ?? []).filter((e) => titles.has(e.title));
  if (dup.length) {
    return NextResponse.json(
      { error: "มีงานชื่อซ้ำอยู่แล้วในลูกค้านี้ — หยุดเพื่อกันอัปซ้ำ", duplicates: dup.map((d) => d.title) },
      { status: 409 },
    );
  }

  if (body.dryRun === true) {
    return NextResponse.json({ dryRun: true, client, existingCount: existing?.length ?? 0, wouldCreate: checked.rows.length });
  }

  const { data: created, error } = await db
    .from("tasks")
    .insert(checked.rows.map((r) => ({ ...r, client_id: client.id })))
    .select("id, title, scheduled_date");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client, created });
}

// Compare-and-set edits. Each update = { id, expect?: {…current values…}, patch: {…} }.
// The row is only changed when every `expect` value still matches the database
// (so nothing a person edited in the app is overwritten); status, assignee,
// client and deletion cannot be changed here.
export async function PATCH(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const updates: unknown = body.updates;
  if (!Array.isArray(updates) || updates.length === 0 || updates.length > 200) {
    return NextResponse.json({ error: "updates ต้องเป็น array 1–200 รายการ" }, { status: 400 });
  }

  const prepared: { id: string; patch: Record<string, unknown>; expect: Record<string, string | null> }[] = [];
  for (const [i, raw] of updates.entries()) {
    const u = (raw ?? {}) as Record<string, unknown>;
    if (!isUuid(u.id)) return NextResponse.json({ error: `updates[${i}].id ไม่ถูกต้อง` }, { status: 400 });
    const patch = sanitizePatch(u.patch);
    if (!patch.ok) return NextResponse.json({ error: `updates[${i}]: ${patch.error}` }, { status: 400 });
    const expect = sanitizeExpect(u.expect);
    if (!expect.ok) return NextResponse.json({ error: `updates[${i}]: ${expect.error}` }, { status: 400 });
    prepared.push({ id: u.id, patch: patch.patch, expect: expect.expect });
  }

  const db = createAdminClient();
  const results: { id: string; updated: boolean; error?: string }[] = [];
  for (const u of prepared) {
    let q = db.from("tasks").update({ ...u.patch, updated_at: new Date().toISOString() }).eq("id", u.id);
    for (const [col, val] of Object.entries(u.expect)) q = val === null ? q.is(col, null) : q.eq(col, val);
    const { data, error } = await q.select("id");
    if (error) results.push({ id: u.id, updated: false, error: error.message });
    else results.push({ id: u.id, updated: (data ?? []).length === 1 });
  }
  return NextResponse.json({ results });
}
