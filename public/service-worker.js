/*
  Uncle Apple Store PWA Service Worker
  - Pre-caches core shell pages/assets
  - Runtime caches visited pages for offline use
  - Cache-first for images (product photos)
  - Stale-while-revalidate for CSS/JS
  - Network-first for HTML navigations
*/

const CACHE_VERSION = 'v2-20260415';
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
  // Activate the updated worker ASAP so users don't have to fully close/reopen.
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE_CACHE);
      // Best-effort precache; bypass HTTP cache so new deploys are fetched.
      await Promise.all(
        CORE_URLS.map(async (url) => {
          try {
            const request = new Request(url, { cache: 'reload' });
            const response = await fetch(request);
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // ignore (some hosts might not serve all URLs at install time)
          }
        }),
      );
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

function isLikelyImagePath(pathname) {
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(pathname || '');
}

function isDataFilePath(pathname) {
  return /\.(json|txt|csv)$/i.test(pathname || '');
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

  // PWA metadata (manifest/icons) should update quickly after deploy.
  if (url.pathname.endsWith('/manifest.json')) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.includes('/icons/') || url.pathname.endsWith('/favicon.svg')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // HTML: network-first so content updates are picked up.
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  const isProductsPath = url.pathname.startsWith(PRODUCTS_PATH_PREFIX);

  // Product data files: network-first so updates show quickly (but still work offline).
  if (isProductsPath && isDataFilePath(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Images (including product photos): cache-first.
  if (isImageRequest(request) || (isProductsPath && isLikelyImagePath(url.pathname))) {
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

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      try {
        if (event.data) payload = event.data.json();
      } catch {
        try {
          const text = event.data ? event.data.text() : '';
          payload = text ? { body: text } : {};
        } catch {
          payload = {};
        }
      }

      const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Uncle Apple Store';
      const body = typeof payload.body === 'string' && payload.body.trim() ? payload.body.trim() : 'New arrivals are available.';

      let targetUrl = withBase('');
      if (typeof payload.url === 'string' && payload.url) {
        try {
          const u = new URL(payload.url, self.location.origin);
          if (u.origin === self.location.origin) targetUrl = u.toString();
        } catch {
          // ignore
        }
      }

      await self.registration.showNotification(title, {
        body,
        icon: withBase('icons/icon-192.png'),
        badge: withBase('icons/icon-192.png'),
        data: { url: targetUrl },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const url = event.notification?.data?.url || withBase('');
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(url);
          if (clientUrl.origin === targetUrl.origin) {
            await client.focus();
            if ('navigate' in client) {
              await client.navigate(targetUrl.toString());
            }
            return;
          }
        } catch {
          // ignore
        }
      }

      await self.clients.openWindow(url);
    })(),
  );
});
