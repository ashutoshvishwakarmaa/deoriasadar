/*
 * Deoria City Guide service worker.
 * - Saves both emergency pages AND everything they need to render (scripts, styles, fonts),
 *   so helplines open fully styled without a connection, even if the browser has cleared its own cache.
 * - Pages: network first, falling back to the saved copy, then to the emergency page.
 * - Hashed build assets (/_next/static): cache first; they never change.
 * Bump VERSION to invalidate old caches after a breaking change.
 */
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE_PAGES = ["/en/emergency", "/hi/emergency"];

// Matches build asset paths inside HTML, the RSC payload (where they appear in escaped JSON) and CSS url(...).
const ASSET_PATH = /\/_next\/static\/[^"'\\\s)<>]+/g;

function findAssets(text) {
  return [...new Set(text.match(ASSET_PATH) ?? [])];
}

/** Download and keep every asset a page needs, following stylesheets to the fonts they reference. */
async function cacheAssets(pageText) {
  const cache = await caches.open(ASSETS);
  const queue = findAssets(pageText);
  const seen = new Set();
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    if (await cache.match(path)) continue;
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      await cache.put(path, res.clone());
      if (path.split("?")[0].endsWith(".css")) queue.push(...findAssets(await res.text()));
    } catch {
      // Offline or blocked: this asset is skipped; the page still works with what was saved.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES);
      await Promise.all(
        OFFLINE_PAGES.map(async (path) => {
          // "reload" skips the browser's HTTP cache so we never save a stale page after a deploy.
          const res = await fetch(path, { cache: "reload" });
          if (!res.ok) throw new Error(`Could not save ${path} for offline use (${res.status})`);
          await pages.put(path, res.clone());
          await cacheAssets(await res.text());
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const res = await fetch(request);
          if (res.ok && OFFLINE_PAGES.includes(url.pathname)) {
            // Refresh the saved page and its assets in the background, so a new deploy never leaves
            // the offline copy pointing at files that were not saved.
            const forPage = res.clone();
            const forAssets = res.clone();
            event.waitUntil(Promise.all([cache.put(url.pathname, forPage), forAssets.text().then(cacheAssets)]));
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
