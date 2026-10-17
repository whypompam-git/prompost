import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
const { proxiedFetch } = await import("../src/lib/supabase/client.ts");

type Call = { url: string; headers: Headers; credentials?: RequestCredentials };
const calls: Call[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  calls.push({ url: String(input), headers: new Headers(init?.headers), credentials: init?.credentials });
  return new Response("{}");
}) as typeof fetch;

test("REST calls are rerouted to /api/sb without the supabase credentials", async () => {
  calls.length = 0;
  await proxiedFetch("https://proj.supabase.co/rest/v1/clients?select=id", {
    headers: { apikey: "anon", Authorization: "Bearer anon", Prefer: "return=representation" },
  });
  assert.equal(calls[0].url, "/api/sb/rest/v1/clients?select=id");
  assert.equal(calls[0].headers.get("apikey"), null);
  assert.equal(calls[0].headers.get("authorization"), null);
  assert.equal(calls[0].headers.get("prefer"), "return=representation");
  assert.equal(calls[0].credentials, "same-origin");
});

test("signed uploads bypass the proxy and go straight to storage", async () => {
  calls.length = 0;
  await proxiedFetch("https://proj.supabase.co/storage/v1/object/upload/sign/slips/a.png?token=t", { method: "PUT" });
  assert.equal(calls[0].url, "https://proj.supabase.co/storage/v1/object/upload/sign/slips/a.png?token=t");
});

test("anything else passes through untouched", async () => {
  calls.length = 0;
  await proxiedFetch("https://example.com/other");
  assert.equal(calls[0].url, "https://example.com/other");
});
