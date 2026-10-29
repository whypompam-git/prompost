// Minimal Anthropic Messages API client (fetch, no SDK). Prices are USD per million tokens (checked 2026-10-30).
export const MODELS = {
  cheap: { id: "claude-haiku-5-5", inPrice: 0.1, outPrice: 0.5 },
  quality: { id: "claude-sonnet-5-5", inPrice: 2, outPrice: 10 },
} as const;
export type ModelTier = keyof typeof MODELS;
export const THB_PER_USD = 35;

export type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };

export function costThb(tier: ModelTier, u: Usage): number {
  const m = MODELS[tier];
  const inUsd =
    ((u.input_tokens ?? 0) * m.inPrice + (u.cache_creation_input_tokens ?? 0) * m.inPrice * 1.25 + (u.cache_read_input_tokens ?? 0) * m.inPrice * 0.05) / 1e6;
  const outUsd = ((u.output_tokens ?? 0) * m.outPrice) / 1e6;
  return Math.round((inUsd + outUsd) * THB_PER_USD * 100) / 100;
}

export class MissingKeyError extends Error {}

// `stable` goes first and is cached (rules + client context); `variable` is the per-request part.
export async function callClaude(opts: {
  tier: ModelTier;
  stable: string;
  variable: string;
  tool: { name: string; description: string; input_schema: Record<string, unknown> };
  maxTokens: number;
}): Promise<{ input: unknown; usage: Usage }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new MissingKeyError("ยังไม่ได้ตั้ง ANTHROPIC_API_KEY ใน Vercel");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELS[opts.tier].id,
      max_tokens: opts.maxTokens,
      system: [{ type: "text", text: opts.stable, cache_control: { type: "ephemeral" } }],
      tools: [opts.tool],
      // this model family rejects a forced tool_choice; the prompt tells it to answer only via the tool
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: opts.variable }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? `Anthropic ${res.status}`);
  const block = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use");
  if (!block) throw new Error("โมเดลไม่ได้ส่งผลลัพธ์กลับมา (อาจถูกตัดเพราะยาวเกิน ลองลดจำนวนคลิป)");
  return { input: block.input, usage: data.usage };
}
