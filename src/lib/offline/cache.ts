// Stale-while-revalidate read cache for list/get queries, backed by
// localStorage. Every wrapped query tries the network first — on success it
// updates the cache and returns fresh data. On failure (no signal), it falls
// back to whatever was cached last, so the page still renders something
// instead of an error screen.

const PREFIX = "prompost:cache:";

// Identical requests made at the same moment (the page and the bell both load the
// same lists on arrival) share one network call. Only IN-FLIGHT calls are shared —
// once it settles the entry is dropped, so nothing is ever served stale.
const inflight = new Map<string, Promise<unknown>>();
export function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const p = fetcher().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  return memo(`cached:${key}`, () => cachedFetchOnce(key, fetcher));
}

// Short in-memory cache: moving between pages reuses lists loaded a moment ago
// instead of downloading them again. Any write (a non-GET request) clears it, so
// your own changes always show; other people's changes show within MEMO_TTL.
const MEMO_TTL = 30_000;
const memoStore = new Map<string, { at: number; value: unknown }>();
let generation = 0;
export function clearMemo() {
  generation += 1;
  memoStore.clear();
}
export function memo<T>(key: string, fetcher: () => Promise<T>, ttl = MEMO_TTL): Promise<T> {
  const hit = memoStore.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value as T);
  const gen = generation;
  return dedupe(key, async () => {
    const value = await fetcher();
    if (gen === generation) memoStore.set(key, { at: Date.now(), value }); // a write happened meanwhile: don't keep it
    return value;
  });
}

// writes anywhere in the app (our API routes or the database proxy) clear the memo
if (typeof window !== "undefined" && !(window as { __ppFetchHooked?: boolean }).__ppFetchHooked) {
  (window as { __ppFetchHooked?: boolean }).__ppFetchHooked = true;
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    if (method !== "GET" && method !== "HEAD") clearMemo();
    return original(input, init);
  };
}

async function cachedFetchOnce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    // the offline copy is written after the page has drawn, and big lists are
    // skipped: stringifying megabytes on a phone freezes the screen for a moment
    const save = () => {
      try {
        const raw = JSON.stringify({ data, savedAt: Date.now() });
        if (raw.length < 1_500_000) localStorage.setItem(PREFIX + key, raw);
      } catch {
        // storage full/unavailable — caching is a nice-to-have, never block on it
      }
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) window.requestIdleCallback(save, { timeout: 3000 });
    else setTimeout(save, 500);
    return data;
  } catch (err) {
    const cached = readCache<T>(key);
    if (cached) return cached.data;
    throw err;
  }
}

export function readCache<T>(key: string): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
