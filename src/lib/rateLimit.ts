import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Limit } from "@/lib/rateLimitRules";

// SERVER-ONLY. Counts recent events of a kind for a key (hashed IP or account id).
export function hashKey(raw: string): string {
  return createHash("sha256").update(`${process.env.SESSION_SECRET ?? ""}:${raw}`).digest("hex").slice(0, 32);
}

export async function tooMany(kind: string, key: string, limit: Limit): Promise<boolean> {
  const since = new Date(Date.now() - limit.windowMs).toISOString();
  const { count, error } = await createAdminClient()
    .from("auth_rate_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("key", key)
    .gte("created_at", since);
  if (error) return false; // never lock everyone out because the counter table is unreachable
  return (count ?? 0) >= limit.max;
}

export async function record(kind: string, key: string): Promise<void> {
  const db = createAdminClient();
  await db.from("auth_rate_events").insert({ kind, key });
  // keep the table small: now and then drop anything older than two days
  if (Math.random() < 0.05) await db.from("auth_rate_events").delete().lt("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
}
