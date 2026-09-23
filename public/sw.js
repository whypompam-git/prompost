// Minimal, deliberately narrow-scoped service worker: caches the app shell
// (pages/static assets, same-origin GET only) so the UI still loads with no
// signal. It never touches non-GET requests or cross-origin calls (Supabase),
// so it can't ever intercept/break a mutation — that's handled separately by
// the app-level offline queue (src/lib/offline/*).

const CACHE_NAME = "prompost-shell-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  const url = new URL(req.url);

  // Only ever handle same-origin GET requests — everything else (POST/
  // PATCH/DELETE, or any cross-origin call like Supabase) passes straight
  // through untouched. API routes are always live data (staff list, auth) —
  // never cache them, or the UI can show stale data after it's changed.
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
