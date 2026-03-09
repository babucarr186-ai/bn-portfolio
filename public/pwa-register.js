// Minimal PWA registration (static file served from /public)
// - Registers on load
// - Checks for updates on each page load
// - Activates updated SW and refreshes the page safely

(function registerPWA() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });

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
