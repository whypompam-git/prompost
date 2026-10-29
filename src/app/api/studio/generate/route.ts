import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { isUuid } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokDay } from "@/lib/alerts";
import { parseSellingLines } from "@/lib/scriptChecks";
import { assignPatterns } from "@/lib/ai/patterns";
import { CLIPS_TOOL, buildStable, buildVariable, parseClips, type StudioMode } from "@/lib/ai/promptBuilder";
import { MissingKeyError, callClaude, costThb, type ModelTier } from "@/lib/ai/anthropic";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_COUNT = { ideas: 15, script: 10 } as const;

// AI generation for the Studio page. Session + studio permission, daily spend cap, every run logged in ai_runs.
// The result goes back to the page for review/checking — nothing is saved to tasks here.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  const live = claims ? await fetchLiveAccess(claims.staffId) : null;
  if (!claims || !live || !live.active || live.ownOnly || (live.role !== "owner" && !live.permissions.studio)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ใช้ AI สคริปต์" }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ยังไม่ได้ตั้ง ANTHROPIC_API_KEY ใน Vercel" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const mode: StudioMode = body.mode === "ideas" ? "ideas" : "script";
  // ideas: Haiku (cheap); full scripts: Sonnet
  const tier: ModelTier = mode === "ideas" ? "cheap" : "quality";
  const count = Math.floor(Number(body.count));
  if (!isUuid(body.clientId)) return NextResponse.json({ error: "ต้องมี clientId" }, { status: 400 });
  if (!(count >= 1 && count <= MAX_COUNT[mode])) return NextResponse.json({ error: `จำนวนคลิปต้อง 1–${MAX_COUNT[mode]}` }, { status: 400 });
  const instruction = typeof body.instruction === "string" ? body.instruction.slice(0, 4000) : "";
  const category = ["mass", "royalty", "sell"].includes(body.category) ? body.category : undefined;

  const db = createAdminClient();
  const cap = Number(process.env.AI_DAILY_CAP_THB ?? 100);
  const dayStart = new Date(`${bangkokDay(new Date())}T00:00:00+07:00`).toISOString();
  const { data: today } = await db.from("ai_runs").select("cost_thb").gte("created_at", dayStart);
  const spent = (today ?? []).reduce((s, r) => s + Number(r.cost_thb ?? 0), 0);
  if (spent >= cap) return NextResponse.json({ error: `ใช้ถึงเพดานวันนี้แล้ว (${spent.toFixed(2)}/${cap} บาท) — ปรับ AI_DAILY_CAP_THB หรือรอพรุ่งนี้` }, { status: 429 });

  const [{ data: client }, { data: ctxRows }, { data: books }, { data: tasks }, { data: runs }] = await Promise.all([
    db.from("clients").select("id, name").eq("id", body.clientId).maybeSingle(),
    db.from("client_context").select("key, content").eq("client_id", body.clientId),
    db.from("ai_playbooks").select("key, title, content").order("key"),
    db.from("tasks").select("title").eq("client_id", body.clientId).order("created_at"),
    db.from("ai_runs").select("id").eq("client_id", body.clientId).eq("status", "ok"),
  ]);
  if (!client) return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 404 });
  const context = Object.fromEntries((ctxRows ?? []).map((r) => [r.key as string, r.content as string]));
  const playbooks = (books ?? []) as { key: string; title: string; content: string }[];

  const patterns = assignPatterns(count, (runs ?? []).length * 3);
  const stable = buildStable(playbooks, context, (tasks ?? []).map((t) => t.title as string));
  const variable = buildVariable(mode, { instruction, patterns, category, sellingLines: parseSellingLines(context.selling_lines ?? "") });

  const base = { client_id: client.id, kind: mode, prompt: instruction, params: { count, category: category ?? null, tier, patterns }, model: tier, created_by: claims.staffId };
  try {
    const { input, usage } = await callClaude({ tier, stable, variable, tool: CLIPS_TOOL, maxTokens: mode === "ideas" ? 6000 : 16000 });
    const clips = parseClips(input).map((c, i) => ({ ...c, category: c.category || category || "", pattern: patterns[i] }));
    const cost = costThb(tier, usage);
    await db.from("ai_runs").insert({ ...base, output: { clips }, tokens_in: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0), tokens_out: usage.output_tokens ?? 0, cost_thb: cost, status: "ok" });
    return NextResponse.json({ clips, costThb: cost, spentToday: spent + cost, cap });
  } catch (e) {
    const message = e instanceof Error ? e.message : "ผิดพลาด";
    await db.from("ai_runs").insert({ ...base, output: { error: message }, status: "error" });
    return NextResponse.json({ error: message }, { status: e instanceof MissingKeyError ? 503 : 502 });
  }
}
