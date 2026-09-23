// Stale-while-revalidate read cache for list/get queries, backed by
// localStorage. Every wrapped query tries the network first — on success it
// updates the cache and returns fresh data. On failure (no signal), it falls
// back to whatever was cached last, so the page still renders something
// instead of an error screen.

const PREFIX = "prompost:cache:";

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
      // storage full/unavailable — caching is a nice-to-have, never block on it
    }
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
