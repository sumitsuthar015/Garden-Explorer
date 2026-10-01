/*
 * Garden Explorer service worker.
 *
 * Adds an installable app shell and a friendly offline page. It deliberately
 * does very little caching of dynamic content:
 *
 *  - NEVER caches /admin, /api, or any authenticated response.
 *  - Uses network-first for navigations so garden content is always fresh, and
 *    falls back to the offline page when the network is unavailable.
 *  - Cache-first only for hashed Next.js static assets and local icons, which
 *    are immutable and safe by construction.
 *
 * Honest limitation: previously visited *pages* are not replayed from cache,
 * because a QR lookup that silently served stale content would be worse than
 * telling the visitor they are offline.
 */

const VERSION = "garden-explorer-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Add individually so one failure cannot abort the whole install.
      await Promise.all(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return false;
}

function isForbidden(url) {
  if (url.pathname.startsWith("/admin")) return true;
  if (url.pathname.startsWith("/api")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET is ever handled; everything else goes straight to the network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch admin or API traffic — those must always be live and private.
  if (isForbidden(url)) return;

  if (isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Navigations: always try the network first, then show the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response("<h1>You're Offline</h1><p>Reconnect to continue exploring.</p>", {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        }
      })(),
    );
  }
});

// Allow the page to trigger an immediate update after a deploy.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
