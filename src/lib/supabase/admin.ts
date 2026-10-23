import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the secret/service-role key, which bypasses Row Level
// Security entirely. Never import this file from a "use client" component —
// it must only ever run in Server Components, Route Handlers, or Server
// Actions. For anything reachable from the browser, use ./client.ts instead.
//
// Every request is sent with cache: "no-store". Without it Next.js's data
// cache can keep serving an old GET result (it once kept reporting an empty
// line_channels table, so the digest was created and sent over and over).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    },
  );
}
