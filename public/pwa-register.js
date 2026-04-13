// Minimal PWA registration (static file served from /public)
// - Registers on load
// - Checks for updates on each page load
// - Activates updated SW and refreshes the page safely

(function registerPWA() {
  if (!('serviceWorker' in navigator)) return;

  const reloadKey = '__ua_sw_reload_once__';
  // If we reloaded once for an update, clear the guard.
  if (sessionStorage.getItem(reloadKey) === '1') {
    sessionStorage.removeItem(reloadKey);
  }

  const localhostNames = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  const isLocalDev = localhostNames.has(window.location.hostname);

  if (isLocalDev) {
    void (async () => {
      try {
        const hadController = Boolean(navigator.serviceWorker.controller);
        const registrations = await navigator.serviceWorker.getRegistrations();
        const hadRegistrations = registrations.length > 0;
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
        }

        // If an old SW was controlling the page, it can keep serving stale cached responses
        // until the next navigation. Reload once after cleanup to fully detach it.
        const reloadKey = '__ua_sw_cleared__';
        if ((hadController || hadRegistrations) && sessionStorage.getItem(reloadKey) !== '1') {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
        }
      } catch {
        // ignore
      }
    })();

    return;
  }

  window.addEventListener('load', async () => {
    try {
      const hadControllerAtStart = Boolean(navigator.serviceWorker.controller);

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

      const reloadOnce = () => {
        if (sessionStorage.getItem(reloadKey) === '1') return;
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      };

      const requestSkipWaiting = (worker) => {
        if (!worker) return;
        try {
          worker.postMessage({ type: 'SKIP_WAITING' });
        } catch {
          // ignore
        }
      };

      const maybeActivateWaitingWorker = () => {
        // If a SW update is already waiting (e.g., from a previous run), updatefound
        // won't fire again. In that case, explicitly tell it to activate.
        if (registration.waiting && navigator.serviceWorker.controller) {
          requestSkipWaiting(registration.waiting);
        }
      };

      // Check for updated SW on each reload.
      try {
        await registration.update();
      } catch {
        // ignore
      }

      maybeActivateWaitingWorker();

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // If there's an existing controller, this is an update.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            requestSkipWaiting(newWorker);
          }
        });
      });

      // In installed PWAs, the app is often resumed (no full reload), so we also
      // trigger update checks when the tab becomes visible / focused / online.
      let lastUpdateCheck = 0;
      const maybeCheckForUpdates = async () => {
        const now = Date.now();
        if (now - lastUpdateCheck < 60_000) return; // throttle
        lastUpdateCheck = now;
        try {
          await registration.update();
        } catch {
          // ignore
        }
        maybeActivateWaitingWorker();
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void maybeCheckForUpdates();
      });
      window.addEventListener('focus', () => void maybeCheckForUpdates());
      window.addEventListener('online', () => void maybeCheckForUpdates());

      // When the new SW takes control, refresh once to get fresh assets.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Avoid a pointless reload on first install.
        if (!hadControllerAtStart) return;
        reloadOnce();
      });
    } catch (err) {
      // Keep silent to avoid breaking existing site UX.
      console.debug('[PWA] SW registration failed', err);
    }
  });
})();
