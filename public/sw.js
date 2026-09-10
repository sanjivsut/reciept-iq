/* ReceiptIQ service worker — lightweight offline support for the PWA.
 *
 * Strategy:
 *  - Precache the app shell (scan screen, offline page, core price subset).
 *  - Navigations: network-first, fall back to cache, then to /offline.
 *  - Static assets (_next/static, icons, fonts): stale-while-revalidate.
 *  - API + OCR calls are never cached (they must reflect live state / a key).
 */

const VERSION = "receiptiq-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const SHELL_URLS = ["/", "/scan", "/about", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/og/") ||
    url.pathname.startsWith("/logo/") ||
    /\.(?:css|js|woff2?|png|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the OCR proxy; let /api/prices be handled network-first below.
  if (url.pathname.startsWith("/api/ocr")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match("/offline")) || Response.error();
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/api/prices")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
