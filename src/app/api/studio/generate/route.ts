import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";
import { isUuid } from "@/lib/aiApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokDay } from "@/lib/alerts";
import { digestScript, parseSellingLines, textSimilarity } from "@/lib/scriptChecks";
import { assignCtas, assignPatterns } from "@/lib/ai/patterns";
import { CLIPS_TOOL, TOPICS_TOOL, buildStable, buildTopicsPrompt, buildVariable, parseClips, parseTopics, type StudioMode, type TopicPlan } from "@/lib/ai/promptBuilder";
import { MissingKeyError, callClaude, costThb, type ModelTier, type Usage } from "@/lib/ai/anthropic";

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
    db.from("tasks").select("title, script_text").eq("client_id", body.clientId).order("created_at"),
    db.from("ai_runs").select("id").eq("client_id", body.clientId).eq("status", "ok"),
  ]);
  if (!client) return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 404 });
  const context = Object.fromEntries((ctxRows ?? []).map((r) => [r.key as string, r.content as string]));
  const playbooks = (books ?? []) as { key: string; title: string; content: string }[];

  const offset = (runs ?? []).length * 3;
  const ctas = assignCtas(count, category, offset);
  const patterns = assignPatterns(count, offset).map((p, i) => ({ ...p, cta: ctas[i] }));
  const recent = (tasks ?? []).map((t) => digestScript(t.title as string, (t.script_text as string | null) ?? ""));
  const stable = buildStable(playbooks, context, recent);
  const sellingLines = parseSellingLines(context.selling_lines ?? "");

  const base = { client_id: client.id, kind: mode, prompt: instruction, params: { count, category: category ?? null, tier, patterns }, model: tier, created_by: claims.staffId };
  try {
    let cost = 0;
    let tokensIn = 0;
    let tokensOut = 0;
    const add = (t: ModelTier, u: Usage) => {
      cost += costThb(t, u);
      tokensIn += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      tokensOut += u.output_tokens ?? 0;
    };

    // full scripts: first lock a distinct TOPIC for every clip with the cheap model, then write them
    let topics: TopicPlan[] | undefined;
    const warnings: string[] = [];
    if (mode === "script") {
      const first = await callClaude({ tier: "cheap", stable, variable: buildTopicsPrompt({ instruction, patterns, category, sellingLines }), tool: TOPICS_TOOL, maxTokens: 4000 });
      add("cheap", first.usage);
      topics = parseTopics(first.input);
      if (topics.length < count) return NextResponse.json({ error: "วางหัวข้อไม่ครบ ลองใหม่อีกครั้ง" }, { status: 502 });
      topics = topics.slice(0, count);
      // topics that are too alike (to each other or to earlier clips) are reported, not hidden
      topics.forEach((t, i) => {
        for (let j = 0; j < i; j++) if (textSimilarity(t.angle, topics![j].angle) > 0.5) warnings.push(`หัวข้อ ${i + 1} คล้ายหัวข้อ ${j + 1}`);
        const old = (tasks ?? []).find((x) => textSimilarity(t.angle, x.title as string) > 0.6);
        if (old) warnings.push(`หัวข้อ ${i + 1} คล้ายคลิปเดิม "${old.title}"`);
      });
    }

    const variable = buildVariable(mode, { instruction, patterns, category, sellingLines, topics });
    const { input, usage } = await callClaude({ tier, stable, variable, tool: CLIPS_TOOL, maxTokens: mode === "ideas" ? 6000 : 16000 });
    add(tier, usage);
    const clips = parseClips(input).map((c, i) => ({ ...c, category: c.category || category || "", pattern: patterns[i], topic: topics?.[i] }));
    cost = Math.round(cost * 100) / 100;
    await db.from("ai_runs").insert({ ...base, params: { ...base.params, topics }, output: { clips, warnings }, tokens_in: tokensIn, tokens_out: tokensOut, cost_thb: cost, status: "ok" });
    return NextResponse.json({ clips, warnings, costThb: cost, spentToday: spent + cost, cap });
  } catch (e) {
    const message = e instanceof Error ? e.message : "ผิดพลาด";
    await db.from("ai_runs").insert({ ...base, output: { error: message }, status: "error" });
    return NextResponse.json({ error: message }, { status: e instanceof MissingKeyError ? 503 : 502 });
  }
}
