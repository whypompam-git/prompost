import { NextResponse } from "next/server";
import { requireAiToken } from "@/lib/aiAuth";
import { validateContextMap, validatePlaybooks } from "@/lib/aiContext";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// AI Studio data for the Claude workspace (token API, like /api/ai/export).
//   GET  ?client=<slug>   → { contexts: { key: markdown } } for that client
//   GET  ?all=1           → every client's contexts, keyed by slug (for pulling back to the folder)
//   GET  ?playbooks=1     → the writing rules
//   PUT  { clientSlug, contexts, overwrite? }  → add context sections (default: only the ones that don't exist yet)
//   PUT  { playbooks:[{key,title,content}], overwrite? } → add/replace writing rules (replacing keeps the old text as a version)
export async function GET(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const db = createAdminClient();
  const url = new URL(request.url);
  try {
    if (url.searchParams.get("playbooks")) {
      const { data, error } = await db.from("ai_playbooks").select("key, title, content, updated_at").order("key");
      if (error) throw error;
      return NextResponse.json({ playbooks: data });
    }
    const slug = url.searchParams.get("client");
    const all = url.searchParams.get("all");
    if (!slug && !all) return NextResponse.json({ error: "ระบุ ?client=<slug> หรือ ?all=1 หรือ ?playbooks=1" }, { status: 400 });
    let q = db.from("client_context").select("key, content, updated_at, clients!inner(slug)");
    if (slug) q = q.eq("clients.slug", slug);
    const { data, error } = await q;
    if (error) throw error;
    const out: Record<string, Record<string, string>> = {};
    for (const r of data ?? []) {
      const c = Array.isArray(r.clients) ? r.clients[0] : r.clients;
      const s = (c as { slug: string } | null)?.slug;
      if (!s) continue;
      (out[s] ??= {})[r.key] = r.content;
    }
    return NextResponse.json(slug ? { contexts: out[slug] ?? {} } : { clients: out });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = requireAiToken(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const overwrite = body.overwrite === true;
  const db = createAdminClient();

  try {
    if (body.playbooks !== undefined) {
      const v = validatePlaybooks(body.playbooks);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      const { data: existing } = await db.from("ai_playbooks").select("key, content").in("key", v.items.map((i) => i.key));
      const have = new Map((existing ?? []).map((e) => [e.key as string, e.content as string]));
      const result: Record<string, string> = {};
      for (const item of v.items) {
        if (have.has(item.key)) {
          if (!overwrite) { result[item.key] = "skipped (exists)"; continue; }
          if (have.get(item.key) === item.content) { result[item.key] = "unchanged"; continue; }
          await db.from("ai_playbook_versions").insert({ playbook_key: item.key, content: have.get(item.key)! });
        }
        const { error } = await db.from("ai_playbooks").upsert({ key: item.key, title: item.title, content: item.content, updated_at: new Date().toISOString() });
        if (error) throw error;
        result[item.key] = have.has(item.key) ? "replaced" : "created";
      }
      return NextResponse.json({ playbooks: result });
    }

    if (typeof body.clientSlug !== "string") return NextResponse.json({ error: "ต้องมี clientSlug + contexts หรือ playbooks" }, { status: 400 });
    const v = validateContextMap(body.contexts);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const { data: clients } = await db.from("clients").select("id").eq("slug", body.clientSlug);
    if (clients?.length !== 1) return NextResponse.json({ error: `หาลูกค้า slug "${body.clientSlug}" ไม่พบ/ซ้ำ` }, { status: 404 });
    const clientId = clients[0].id as string;
    const { data: existing } = await db.from("client_context").select("key").eq("client_id", clientId).in("key", Object.keys(v.map));
    const have = new Set((existing ?? []).map((e) => e.key as string));
    const result: Record<string, string> = {};
    const rows = [];
    for (const [key, content] of Object.entries(v.map)) {
      if (have.has(key) && !overwrite) { result[key] = "skipped (exists)"; continue; }
      rows.push({ client_id: clientId, key, content, updated_at: new Date().toISOString() });
      result[key] = have.has(key) ? "replaced" : "created";
    }
    if (rows.length) {
      const { error } = await db.from("client_context").upsert(rows, { onConflict: "client_id,key" });
      if (error) throw error;
    }
    return NextResponse.json({ contexts: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
