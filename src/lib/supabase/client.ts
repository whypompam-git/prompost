import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Every REST / Storage request is rerouted to our own /api/sb proxy, which
// checks the login session and permissions before talking to Supabase. The
// anon key still ships in the bundle (it must, for the client library) but
// carries no access once the database is locked down.
export const proxiedFetch: typeof fetch = (input, init) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  // signed uploads authenticate with their own one-shot token and go straight
  // to Storage (the proxy's body-size limit would reject large files)
  if (rawUrl.includes("/storage/v1/object/upload/sign/")) return fetch(input, init);
  for (const prefix of ["/rest/v1", "/storage/v1"]) {
    if (rawUrl.startsWith(`${SUPABASE_URL}${prefix}`)) {
      const target = `/api/sb${rawUrl.slice(SUPABASE_URL.length)}`;
      const headers = new Headers(init?.headers ?? (typeof input === "object" && "headers" in input ? input.headers : undefined));
      headers.delete("apikey");
      headers.delete("authorization");
      return fetch(target, { ...init, headers, credentials: "same-origin" });
    }
  }
  return fetch(input, init);
};

export function createClient() {
  return createBrowserClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: proxiedFetch },
  });
}
