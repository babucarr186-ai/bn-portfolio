/*
  Uncle Apple Store PWA Service Worker
  - Pre-caches core shell pages/assets
  - Runtime caches visited pages for offline use
  - Cache-first for images (product photos)
  - Stale-while-revalidate for CSS/JS
  - Network-first for HTML navigations
*/

const CACHE_VERSION = 'v2-20260409';
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const BASE_PATH = (() => {
  try {
    const p = new URL(self.registration.scope).pathname;
    return p.endsWith('/') ? p : p + '/';
  } catch {
    return '/';
  }
})();

function withBase(path) {
  if (!path) return BASE_PATH;
  // Keep absolute URLs intact.
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;
  return BASE_PATH + path;
}

const CORE_PATHS = [
  '',
  'index.html',
  'cart.html',
  'checkout.html',
  'ipads.html',
  'macbook.html',
  'apple-watch.html',
  'airpods.html',
  'gift-cards.html',
  'accessories.html',
  'apple-tv-home.html',
  'uncle-apple-premium.html',
  'sell-device/',
  'models/',
  'support/',
  'about/',
  'buy-iphone-gambia/',
  'cheap-iphone-gambia/',
  'used-iphone-senegal/',
  'apple-store-gambia/',
  'contact/',
  'refund-policy/',
  'privacy-policy/',
  'terms-of-service/',
  'site.css',
  'styles.css',
  'pwa-register.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'favicon.svg',
];

const CORE_URLS = CORE_PATHS.map(withBase);
const PRODUCTS_PATH_PREFIX = withBase('products/').replace(/\/$/, '');

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE_CACHE);
      // Use addAll for best-effort precache; ignore failures so install doesn't brick.
      try {
        await cache.addAll(CORE_URLS);
      } catch {
        // ignore (some hosts might not serve all URLs at install time)
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![CORE_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      );

      // Take control so updates apply quickly.
      await self.clients.claim();
    })(),
  );
});

function isHtmlRequest(request) {
  const accept = request.headers.get('accept') || '';
  return request.mode === 'navigate' || accept.includes('text/html');
}

function isImageRequest(request) {
  return request.destination === 'image';
}

function isStaticAssetRequest(request) {
  return ['style', 'script', 'worker', 'font'].includes(request.destination);
}

async function cachePut(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {
    // ignore
  }
}

async function networkFirst(request) {
  try {
    // Avoid HTTP cache when fetching HTML so updates appear quickly.
    const fetchRequest = new Request(request, { cache: 'no-store' });
    const response = await fetch(fetchRequest);
    if (response && response.ok) {
      await cachePut(RUNTIME_CACHE, request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // If this is a navigation, try a cached homepage as a last resort.
    if (request.mode === 'navigate') {
      const fallback = await caches.match(withBase('index.html'));
      if (fallback) return fallback;
    }

    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = (async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        await cachePut(RUNTIME_CACHE, request, response.clone());
      }
      return response;
    } catch {
      return undefined;
    }
  })();

  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

async function cacheFirstImage(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cachePut(IMAGE_CACHE, request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Image unavailable offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request || request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Always bypass SW caching for the SW script + registration helper.
  // This prevents the "old pwa-register.js keeps the old SW alive" loop.
  if (url.pathname.endsWith('/service-worker.js') || url.pathname.endsWith('/pwa-register.js')) {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
    return;
  }

  // HTML: network-first so content updates are picked up.
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Images (including product photos): cache-first.
  if (isImageRequest(request) || url.pathname.startsWith(PRODUCTS_PATH_PREFIX)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  // CSS/JS: stale-while-revalidate.
  if (isStaticAssetRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: try cache, then network.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          await cachePut(RUNTIME_CACHE, request, response.clone());
        }
        return response;
      } catch {
        return new Response('Offline', { status: 503 });
      }
    })(),
  );
});
