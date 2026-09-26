// Coffee Cart POS — service worker
//
// Hand-written (no vite-plugin-pwa / Workbox) so this project stays free
// of build-time PWA tooling that can't be verified without npm registry
// access — the same trade-off Phase 6 made for PDF export (hand-rolled
// print stylesheet instead of a PDF library). See HANDOFF.md "Decisions
// Already Made" for the full reasoning.
//
// This file is served as-is from /public — it is plain JS, not compiled
// by the project's tsc/Vite pipeline, the same way favicon.svg is a
// static asset. It therefore cannot import anything from src/.
//
// Strategy: cache-first for the app shell (HTML/JS/CSS/fonts/icons).
// The cache is populated opportunistically at runtime rather than from
// a precompiled precache manifest, since Vite's hashed build filenames
// (e.g. index-B19zAw9w.js) aren't known at author time without a
// build-integrated manifest step — the first successful online visit
// warms the cache for every later offline visit.
//
// IMPORTANT: bump CACHE_VERSION on any deploy that changes a cached
// file, so `activate` evicts the old cache. This is a manual step —
// there is no automatic content-hash-based cache busting without adding
// a build plugin. See HANDOFF.md for this trade-off.
const CACHE_VERSION = "v2";
const CACHE_NAME = `coffee-cart-pos-shell-${CACHE_VERSION}`;

// URLs known at author time (unhashed, stable paths), precached on
// install so the very first offline load has an app shell to fall back
// to even before anything else has been requested.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // One failed precache URL (e.g. a 404 in an unusual deploy layout)
      // shouldn't block installation of the rest of the shell.
      .catch((err) => console.warn("Coffee Cart POS SW: precache partial failure", err)),
  );
  // Deliberately NOT self.skipWaiting() here. A new service worker only
  // takes over once the person explicitly taps "Reload to update" in the
  // app's own update banner (see src/pwa/registerServiceWorker.ts) — an
  // in-progress sale on the POS screen must never be interrupted by a
  // silent takeover.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// The update banner's "Reload to update" button posts this so the
// waiting worker activates immediately instead of waiting for every tab
// to close on its own.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only same-origin GET requests are handled. This app makes no
  // cross-origin network calls at all (no API, no analytics), so this
  // guard mainly future-proofs against something like a browser
  // extension's injected request reaching this handler.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navigation requests (the document itself). HashRouter means every
  // route ("/", "/#/history", "/#/reports", ...) is served from the same
  // index.html — the hash never reaches the network — so cache-first
  // against the one cached document covers every route offline.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() => caches.match("/index.html"));
      }),
    );
    return;
  }

  // Everything else — the hashed JS/CSS bundle, self-hosted Manrope
  // fonts, icons: cache-first, opportunistically caching whatever wasn't
  // already precached. This is how the hashed Vite build output ends up
  // fully cached without a build-time precache manifest.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      });
      // No further .catch: if this is the first-ever request for an
      // asset AND the device is offline, there's nothing to fall back
      // to — the same outcome as any uncached asset in any offline app.
    }),
  );
});
