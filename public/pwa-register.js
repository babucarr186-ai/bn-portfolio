// Minimal PWA registration (static file served from /public)
// - Registers on load
// - Checks for updates on each page load
// - Activates updated SW and refreshes the page safely

(function registerPWA() {
  if (!('serviceWorker' in navigator)) return;

  const localhostNames = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  const isLocalDev = localhostNames.has(window.location.hostname);

  if (isLocalDev) {
    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
        }
      } catch {
        // ignore
      }
    })();

    return;
  }

  window.addEventListener('load', async () => {
    try {
      // Resolve URLs relative to where this file is served from.
      // This keeps GitHub Pages project sites (served under /<repo>/) working.
      const baseUrl = new URL('.', import.meta.url);
      const swUrl = new URL('service-worker.js', baseUrl).toString();
      const scopePath = new URL('.', baseUrl).pathname;

      // Normalize PWA asset links (some pages are copied verbatim from /public).
      try {
        const manifestUrl = new URL('manifest.json', baseUrl).toString();
        const touchIconUrl = new URL('icons/icon-192.png', baseUrl).toString();

        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) manifestLink.setAttribute('href', manifestUrl);

        const touchIconLink = document.querySelector('link[rel="apple-touch-icon"]');
        if (touchIconLink) touchIconLink.setAttribute('href', touchIconUrl);
      } catch {
        // ignore
      }

      const registration = await navigator.serviceWorker.register(swUrl, { scope: scopePath });

      // Check for updated SW on each reload.
      try {
        await registration.update();
      } catch {
        // ignore
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // If there's an existing controller, this is an update.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            try {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            } catch {
              // ignore
            }
          }
        });
      });

      // When the new SW takes control, refresh once to get fresh assets.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      // Keep silent to avoid breaking existing site UX.
      console.debug('[PWA] SW registration failed', err);
    }
  });
})();
