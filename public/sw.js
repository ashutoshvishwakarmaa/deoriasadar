/*
 * Deoria City Guide service worker.
 * - Install saves the emergency pages (required) and the explore, map and search pages (best effort) in both
 *   languages, with every script, style, font and lazily loaded chunk they need, so they open fully
 *   working without a connection.
 * - Pages: network first. Every page visited online is saved too, so places someone has looked at
 *   stay readable offline. Offline, a page that was never saved falls back to the emergency page.
 * - Hashed build assets (/_next/static): cache first; they never change.
 * - Optimised photos (/_next/image) and OpenStreetMap tiles: saved as they are viewed, cache first,
 *   with a size cap. Tiles are never prefetched in bulk (OSM tile usage policy), so the offline map
 *   shows the areas the visitor has already looked at.
 * Bump VERSION to invalidate old caches after a breaking change.
 */
const VERSION = "v3";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const TILES = `tiles-${VERSION}`;
const CACHES = [PAGES, ASSETS, IMAGES, TILES];

const REQUIRED_PAGES = ["/en/emergency", "/hi/emergency"];
const EXTRA_PAGES = ["/en/explore", "/hi/explore", "/en/map", "/hi/map", "/en/search", "/hi/search"];
const PRECACHED = new Set([...REQUIRED_PAGES, ...EXTRA_PAGES]);
const LIMITS = { [PAGES]: 80, [IMAGES]: 120, [TILES]: 400 };

// Build asset paths: absolute ones in HTML, RSC payloads (escaped JSON) and CSS url(...), and the
// relative "static/chunks/…" form that JS chunks use to load other chunks on demand (the map).
const ASSET_PATH = /\/_next\/static\/[^"'\\\s)<>]+/g;
const CHUNK_PATH = /["'](static\/(?:chunks|media)\/[^"'\\\s]+)["']/g;

function findAssets(text) {
  const found = new Set(text.match(ASSET_PATH) ?? []);
  for (const m of text.matchAll(CHUNK_PATH)) found.add(`/_next/${m[1]}`);
  return [...found];
}

// Assets already saved together with everything they load. Hashed files never change, so each is
// read and scanned once per worker lifetime rather than on every page visit.
const complete = new Set();

/** Download and keep every asset a page needs, following stylesheets and scripts to what they load. */
async function cacheAssets(pageText) {
  const cache = await caches.open(ASSETS);
  const queue = findAssets(pageText);
  const seen = new Set();
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path) || complete.has(path)) continue;
    seen.add(path);
    try {
      let res = await cache.match(path);
      if (!res) {
        res = await fetch(path);
        if (!res.ok) continue;
        await cache.put(path, res.clone());
      }
      if (/\.(css|js)$/.test(path.split("?")[0])) queue.push(...findAssets(await res.text()));
      complete.add(path);
    } catch {
      // Offline or blocked: this asset is skipped; the page still works with what was saved.
    }
  }
}

async function savePage(path, required) {
  try {
    // "reload" skips the browser's HTTP cache so we never save a stale page after a deploy.
    const res = await fetch(path, { cache: "reload" });
    if (!res.ok) throw new Error(`Could not save ${path} for offline use (${res.status})`);
    // Download the whole page before storing it, so a connection lost mid-download never
    // leaves a half-written entry in the cache.
    const html = await res.text();
    await (await caches.open(PAGES)).put(path, new Response(html, { status: res.status, headers: res.headers }));
    await cacheAssets(html);
  } catch (error) {
    if (required) throw error;
  }
}

/** Drop the oldest entries beyond the cache's limit, never the precached pages. */
async function trim(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  let excess = keys.length - LIMITS[name];
  for (const key of keys) {
    if (excess <= 0) break;
    if (name === PAGES && PRECACHED.has(new URL(key.url).pathname)) continue;
    await cache.delete(key);
    excess--;
  }
}

/** Cache first; on a miss, fetch, keep a copy (opaque cross-origin responses included) and trim. */
async function cacheFirst(request, name, event) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") {
    event.waitUntil(cache.put(request, res.clone()).then(() => LIMITS[name] && trim(name)));
  }
  return res;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(REQUIRED_PAGES.map((p) => savePage(p, true)));
      await Promise.all(EXTRA_PAGES.map((p) => savePage(p, false)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pages reached by client-side navigation never pass through "navigate" below, so the page reports
// its path (components/offline-status.tsx) and the worker saves it if it has no copy yet.
const PAGE_PATH = /^\/(en|hi)(\/[a-z0-9-]+)*$/;
self.addEventListener("message", (event) => {
  const { type, path } = event.data ?? {};
  if (type !== "save-page" || typeof path !== "string" || !PAGE_PATH.test(path)) return;
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.match(path))
      .then((hit) => hit || savePage(path, false).then(() => trim(PAGES))),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(cacheFirst(request, TILES, event));
    return;
  }
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, ASSETS, event));
    return;
  }
  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(request, IMAGES, event));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const res = await fetch(request);
          const html = res.headers.get("content-type")?.includes("text/html");
          if (res.ok && html && /^\/(en|hi)(\/|$)/.test(url.pathname)) {
            // Keep the page (by path, so ?query variants share one copy) and refresh its assets in
            // the background, so a new deploy never leaves a saved page pointing at missing files.
            const forPage = res.clone();
            const forAssets = res.clone();
            event.waitUntil(
              Promise.all([cache.put(url.pathname, forPage).then(() => trim(PAGES)), forAssets.text().then(cacheAssets)]),
            );
          }
          return res;
        } catch {
          const cached = await cache.match(url.pathname);
          if (cached) return cached;
          const locale = url.pathname.startsWith("/hi") ? "hi" : "en";
          return (await cache.match(`/${locale}/emergency`)) ?? Response.error();
        }
      })(),
    );
  }
});
