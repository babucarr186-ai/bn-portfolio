// Minimal PWA registration (static file served from /public)
// - Registers on load
// - Checks for updates on each page load / resume
// - Activates updated SW and refreshes the page safely
// - Adds a clean install CTA where supported + iOS/Safari fallback

const UA_INSTALL_DISMISS_UNTIL_KEY = '__ua_install_dismissed_until__';
const UA_INSTALL_BANNER_ID = 'ua-install-banner';

let deferredInstallPrompt = null;

const UA_SCRIPT_BASE_URL = (() => {
  try {
    const src = document.currentScript && document.currentScript.src ? document.currentScript.src : '';
    const scriptUrl = src ? new URL(src, window.location.href) : new URL(window.location.href);
    return new URL('.', scriptUrl);
  } catch {
    return new URL('.', window.location.href);
  }
})();

function uaNow() {
  return Date.now();
}

function uaIsStandalone() {
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    // ignore
  }
  // iOS Safari legacy
  // eslint-disable-next-line no-undef
  return Boolean(window.navigator && window.navigator.standalone);
}

function uaIsIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua);
}

function uaIsSafari() {
  const ua = navigator.userAgent || '';
  const isWebKit = /AppleWebKit/i.test(ua);
  const isSafari = /Safari/i.test(ua);
  const isOther = /CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Edg|OPR/i.test(ua);
  return isWebKit && isSafari && !isOther;
}

function uaDismissedUntil() {
  try {
    const raw = localStorage.getItem(UA_INSTALL_DISMISS_UNTIL_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function uaDismissForDays(days) {
  try {
    const until = uaNow() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(UA_INSTALL_DISMISS_UNTIL_KEY, String(until));
  } catch {
    // ignore
  }
}

function uaShouldShowInstallUI() {
  if (uaIsStandalone()) return false;
  if (uaNow() < uaDismissedUntil()) return false;
  return true;
}

function uaRemoveBanner() {
  const el = document.getElementById(UA_INSTALL_BANNER_ID);
  if (el) el.remove();
}

function uaEnsureCommonBannerStyle() {
  if (document.getElementById('ua-banner-style')) return;

  const style = document.createElement('style');
  style.id = 'ua-banner-style';
  style.textContent = `
.ua-banner {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 2147483647;
  background: rgba(10, 10, 10, 0.92);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
}
.ua-banner .ua-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ua-banner .ua-copy {
  flex: 1;
  min-width: 0;
}
.ua-banner .ua-title {
  font: 600 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  margin: 0;
}
.ua-banner .ua-sub {
  font: 400 12px/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  opacity: 0.9;
  margin: 2px 0 0;
}
.ua-banner .ua-btn {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  font: 600 13px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  cursor: pointer;
  background: #fff;
  color: #000;
  white-space: nowrap;
}
.ua-banner .ua-close {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.85);
  font: 600 18px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  padding: 6px 8px;
  cursor: pointer;
}
@media (min-width: 900px) {
  .ua-banner.ua-banner--right { left: auto; right: 16px; bottom: 16px; width: 360px; }
  .ua-banner.ua-banner--left { left: 16px; right: auto; bottom: 16px; width: 360px; }
}
`;
  document.head.appendChild(style);
}

function uaEnsureBanner({ mode }) {
  if (!uaShouldShowInstallUI()) return null;
  if (document.getElementById(UA_INSTALL_BANNER_ID)) return document.getElementById(UA_INSTALL_BANNER_ID);

  uaEnsureCommonBannerStyle();

  const banner = document.createElement('div');
  banner.className = 'ua-banner ua-banner--right';
  banner.id = UA_INSTALL_BANNER_ID;
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Install app');

  const title = 'Uncle Apple Store';

  let sub = 'Install this app for faster access.';
  let ctaLabel = 'Install';

  if (mode === 'ios') {
    sub = 'To install this app on iPhone, tap Share, then Add to Home Screen.';
    ctaLabel = '';
  }

  banner.innerHTML = `
  <div class="ua-row">
    <div class="ua-copy">
      <p class="ua-title">${title}</p>
      <p class="ua-sub">${sub}</p>
    </div>
    ${mode === 'prompt' ? '<button class="ua-btn" type="button">Install</button>' : ''}
    <button class="ua-close" type="button" aria-label="Dismiss">×</button>
  </div>
  `;

  banner.querySelector('.ua-close')?.addEventListener('click', () => {
    uaDismissForDays(14);
    uaRemoveBanner();
  });

  if (mode === 'prompt') {
    banner.querySelector('.ua-btn')?.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          uaRemoveBanner();
        } else {
          // If they dismiss the browser prompt, back off for a while.
          uaDismissForDays(14);
          uaRemoveBanner();
        }
      } catch {
        // ignore
      }
    });
  }

  document.body.appendChild(banner);
  return banner;
}

// Install prompt: supported Chromium browsers
window.addEventListener('beforeinstallprompt', (event) => {
  // If we don't preventDefault(), Chrome shows its own mini-infobar.
  event.preventDefault();
  deferredInstallPrompt = event;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => uaEnsureBanner({ mode: 'prompt' }), { once: true });
  } else {
    uaEnsureBanner({ mode: 'prompt' });
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  uaRemoveBanner();
});

// iPhone/Safari fallback
(function uaMaybeShowIosFallback() {
  if (!uaIsIOS() || !uaIsSafari()) return;
  if (!uaShouldShowInstallUI()) return;

  const show = () => {
    // If the install prompt became available, prefer that.
    if (deferredInstallPrompt) return;
    uaEnsureBanner({ mode: 'ios' });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(show, 1500), { once: true });
  } else {
    setTimeout(show, 1500);
  }
})();

// Push notification subscription (new arrivals)
const UA_NOTIFY_DISMISS_UNTIL_KEY = '__ua_notify_dismissed_until__';
const UA_NOTIFY_BANNER_ID = 'ua-notify-banner';

function uaIsSecureEnoughForPush() {
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function uaSupportsPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function uaNotifyDismissedUntil() {
  try {
    const raw = localStorage.getItem(UA_NOTIFY_DISMISS_UNTIL_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function uaDismissNotifyForDays(days) {
  try {
    const until = uaNow() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(UA_NOTIFY_DISMISS_UNTIL_KEY, String(until));
  } catch {
    // ignore
  }
}

function uaBase64UrlToUint8Array(base64Url) {
  const input = String(base64Url || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = input + pad;
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function uaFetchVapidPublicKey() {
  const url = new URL('/.netlify/functions/push-vapid-key', window.location.origin).toString();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const key = data && typeof data.publicKey === 'string' ? data.publicKey.trim() : '';
  return key || null;
}

async function uaSendSubscriptionToBackend(payload) {
  const url = new URL('/.netlify/functions/push-subscribe', window.location.origin).toString();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return { ok: false, stored: false };

    const data = await res.json().catch(() => null);
    const stored = Boolean(data && data.stored === true);
    return { ok: true, stored };
  } catch {
    return { ok: false, stored: false };
  }
}

function uaRemoveNotifyBanner() {
  const el = document.getElementById(UA_NOTIFY_BANNER_ID);
  if (el) el.remove();
}

function uaSetNotifyBannerMessage(message) {
  const el = document.getElementById(UA_NOTIFY_BANNER_ID);
  const msgEl = el ? el.querySelector('.ua-sub') : null;
  if (msgEl && typeof message === 'string') msgEl.textContent = message;
}

function uaEnsureNotifyBanner() {
  if (document.getElementById(UA_NOTIFY_BANNER_ID)) return document.getElementById(UA_NOTIFY_BANNER_ID);

  uaEnsureCommonBannerStyle();

  const banner = document.createElement('div');
  banner.className = 'ua-banner ua-banner--left';
  banner.id = UA_NOTIFY_BANNER_ID;
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Notifications');

  banner.innerHTML = `
  <div class="ua-row">
    <div class="ua-copy">
      <p class="ua-title">Notify me about new arrivals</p>
      <p class="ua-sub">Get a notification when new products are added.</p>
    </div>
    <button class="ua-btn" type="button">Enable</button>
    <button class="ua-close" type="button" aria-label="Dismiss">×</button>
  </div>
  `;

  banner.querySelector('.ua-close')?.addEventListener('click', () => {
    uaDismissNotifyForDays(30);
    uaRemoveNotifyBanner();
  });

  banner.querySelector('.ua-btn')?.addEventListener('click', async () => {
    // Respectful: never request permission without a user click.
    try {
      if (!uaSupportsPush() || !uaIsSecureEnoughForPush()) {
        uaSetNotifyBannerMessage('Notifications are not supported in this browser.');
        return;
      }

      // iOS: push works only for installed Home Screen apps (iOS 16.4+).
      if (uaIsIOS() && !uaIsStandalone()) {
        uaSetNotifyBannerMessage('On iPhone, add to Home Screen first to enable notifications.');
        return;
      }

      const baseUrl = UA_SCRIPT_BASE_URL;
      const swUrl = new URL('service-worker.js', baseUrl).toString();
      const scopePath = baseUrl.pathname;

      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: scopePath,
        updateViaCache: 'none',
      });

      const permission = Notification.permission;
      if (permission === 'denied') {
        uaSetNotifyBannerMessage('Notifications are blocked in your browser settings.');
        return;
      }

      if (permission === 'default') {
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
          uaSetNotifyBannerMessage('No problem — you can enable this later.');
          uaDismissNotifyForDays(30);
          uaRemoveNotifyBanner();
          return;
        }
      }

      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const subscriptionJson = typeof existing.toJSON === 'function' ? existing.toJSON() : existing;

        const res = await uaSendSubscriptionToBackend({
          action: 'subscribe',
          subscription: subscriptionJson,
          createdAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });

        if (res.stored) {
          uaSetNotifyBannerMessage('You are subscribed to new arrivals.');
        } else {
          uaSetNotifyBannerMessage('Enabled on this device — server setup pending.');
        }

        uaDismissNotifyForDays(180);
        uaRemoveNotifyBanner();
        return;
      }

      const publicKey = await uaFetchVapidPublicKey();
      if (!publicKey) {
        uaSetNotifyBannerMessage('Notifications are not configured yet.');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: uaBase64UrlToUint8Array(publicKey),
      });

      const subscriptionJson = typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription;

      const res = await uaSendSubscriptionToBackend({
        action: 'subscribe',
        subscription: subscriptionJson,
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });

      if (res.stored) {
        uaSetNotifyBannerMessage('Subscribed — we will notify you about new arrivals.');
      } else {
        uaSetNotifyBannerMessage('Enabled on this device — server setup pending.');
      }

      uaDismissNotifyForDays(180);
      uaRemoveNotifyBanner();
    } catch {
      uaSetNotifyBannerMessage('Could not enable notifications right now.');
    }
  });

  document.body.appendChild(banner);
  return banner;
}

(function uaMaybeShowNotifyBanner() {
  if (uaNow() < uaNotifyDismissedUntil()) return;
  if (!uaSupportsPush() || !uaIsSecureEnoughForPush()) return;
  if (Notification.permission === 'denied') return;

  // On iPhone, only show in Safari when the app is installed.
  if (uaIsIOS() && !uaIsStandalone()) return;

  const show = async () => {
    try {
      const baseUrl = UA_SCRIPT_BASE_URL;
      const swUrl = new URL('service-worker.js', baseUrl).toString();
      const scopePath = baseUrl.pathname;
      const registration = await navigator.serviceWorker.register(swUrl, { scope: scopePath, updateViaCache: 'none' });
      const existing = await registration.pushManager.getSubscription();
      if (existing) return;
    } catch {
      // ignore
    }

    uaEnsureNotifyBanner();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(show, 4000), { once: true });
  } else {
    setTimeout(show, 4000);
  }
})();

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
      const baseUrl = UA_SCRIPT_BASE_URL;
      const swUrl = new URL('service-worker.js', baseUrl).toString();
      const scopePath = baseUrl.pathname;

      // Normalize PWA asset links (some pages are copied verbatim from /public).
      try {
        const manifestUrl = new URL('manifest.json', baseUrl).toString();
        const touchIconUrl = new URL('icons/icon-180.png', baseUrl).toString();

        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) manifestLink.setAttribute('href', manifestUrl);

        const touchIconLink = document.querySelector('link[rel="apple-touch-icon"]');
        if (touchIconLink) {
          touchIconLink.setAttribute('href', touchIconUrl);
          touchIconLink.setAttribute('sizes', '180x180');
        }
      } catch {
        // ignore
      }

      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: scopePath,
        // Ask browsers to bypass HTTP cache for SW update checks (supported browsers only).
        updateViaCache: 'none',
      });

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
        const now = uaNow();
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
