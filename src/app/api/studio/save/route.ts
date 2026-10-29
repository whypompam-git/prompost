import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { isUuid, validateNewTasks } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokDay, addDays } from "@/lib/alerts";

export const dynamic = "force-dynamic";

// "ลงระบบ" from the AI Studio check page. Session + the AI Studio permission.
//   create: new clips as Plan (waiting for the client) with a TEMPORARY date — duplicate titles for the client are refused
//   update: replace a clip's script, only if it is still exactly what the page loaded (compare-and-set)
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  const live = claims ? await fetchLiveAccess(claims.staffId) : null;
  if (!live || !live.active || live.ownOnly || (live.role !== "owner" && !live.permissions.studio)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ใช้ AI สคริปต์" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isUuid(body.clientId)) return NextResponse.json({ error: "ต้องมี clientId" }, { status: 400 });
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("id, name").eq("id", body.clientId).maybeSingle();
  if (!client) return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 404 });

  const out: { created?: { id: string; title: string }[]; updated?: { id: string; updated: boolean; error?: string }[]; tempDate?: string } = {};

  if (Array.isArray(body.create) && body.create.length > 0) {
    const temp = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : addDays(bangkokDay(new Date()), 14);
    const checked = validateNewTasks(
      body.create.map((t: Record<string, unknown>) => ({
        title: t.title,
        type: "plan",
        category: t.category || null,
        scheduledDate: temp,
        dueDate: temp,
        script: t.script,
        notes: t.notes ?? null,
        shots: Array.isArray(t.shots) ? t.shots : [],
      })),
    );
    if (!checked.ok) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: checked.errors }, { status: 400 });
    const { data: existing } = await db.from("tasks").select("title").eq("client_id", client.id);
    const have = new Set((existing ?? []).map((e) => e.title as string));
    const dup = checked.rows.filter((r) => have.has(r.title)).map((r) => r.title);
    if (dup.length) return NextResponse.json({ error: "มีงานชื่อซ้ำอยู่แล้วในลูกค้านี้ — หยุดเพื่อกันลงซ้ำ", duplicates: dup }, { status: 409 });
    const { data, error } = await db.from("tasks").insert(checked.rows.map((r) => ({ ...r, client_id: client.id }))).select("id, title");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    out.created = data ?? [];
    out.tempDate = temp;
  }

  if (Array.isArray(body.update) && body.update.length > 0) {
    if (body.update.length > 100) return NextResponse.json({ error: "แก้ได้ครั้งละไม่เกิน 100 งาน" }, { status: 400 });
    out.updated = [];
    for (const u of body.update as Record<string, unknown>[]) {
      if (!isUuid(u.id) || typeof u.script !== "string" || u.script.length > 50_000 || (u.expectScript != null && typeof u.expectScript !== "string")) {
        out.updated.push({ id: String(u.id), updated: false, error: "ข้อมูลไม่ถูกต้อง" });
        continue;
      }
      let q = db.from("tasks").update({ script_text: u.script, updated_at: new Date().toISOString() }).eq("id", u.id).eq("client_id", client.id);
      q = u.expectScript == null || u.expectScript === "" ? q.or("script_text.is.null,script_text.eq.") : q.eq("script_text", u.expectScript as string);
      const { data, error } = await q.select("id");
      out.updated.push(error ? { id: u.id, updated: false, error: error.message } : { id: u.id, updated: (data ?? []).length === 1, error: (data ?? []).length === 1 ? undefined : "สคริปต์ในระบบถูกแก้ไปแล้ว (ไม่ทับ)" });
    }
  }

  if (!out.created && !out.updated) return NextResponse.json({ error: "ไม่มี create/update" }, { status: 400 });
  return NextResponse.json(out);
}
