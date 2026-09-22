import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the secret/service-role key, which bypasses Row Level
// Security entirely. Never import this file from a "use client" component —
// it must only ever run in Server Components, Route Handlers, or Server
// Actions. For anything reachable from the browser, use ./client.ts instead.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
