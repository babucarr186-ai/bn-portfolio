// Referral attribution for WhatsApp enquiries, not proof of a completed sale.
(function () {
  'use strict';
  if (window.uaReferral) return;
  const key = 'ua_referral_v1';
  const lifetime = 30 * 24 * 60 * 60 * 1000;
  const allowed = new Set(['TEEMA']);
  const normalize = value => String(value || '').trim().toUpperCase();
  let memory = null;
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (stored && allowed.has(stored.code) && Number.isFinite(stored.expires) && stored.expires > Date.now()) memory = stored;
    else localStorage.removeItem(key);
  } catch { /* Attribution still works on this page if storage is unavailable. */ }
  const incoming = normalize(new URL(window.location.href).searchParams.get('ref'));
  if (allowed.has(incoming)) {
    memory = { code: incoming, expires: Date.now() + lifetime };
    try { localStorage.setItem(key, JSON.stringify(memory)); } catch { /* Private storage may be blocked. */ }
  }
  function code() {
    return memory && memory.expires > Date.now() ? memory.code : '';
  }
  function decorate(href) {
    if (!code()) return href;
    try {
      const url = new URL(href, window.location.href);
      if (url.protocol !== 'https:' || !['wa.me', 'api.whatsapp.com'].includes(url.hostname)) return href;
      const number = (url.hostname === 'wa.me' ? url.pathname.slice(1) : url.searchParams.get('phone') || '').replace(/\D/g, '');
      if (!['220833013139', '4915679652076'].includes(number)) return href;
      const message = url.searchParams.get('text') || 'Hi Uncle Apple Store! I would like to enquire about a product.';
      const clean = message.replace(/(?:\r?\n)*Referral code: TEEMA\s*$/i, '');
      url.searchParams.set('text', clean + '\n\nReferral code: ' + code());
      return url.href;
    } catch { return href; }
  }
  window.uaReferral = { code, decorate };
  function update(anchor) {
    const href = anchor.getAttribute('href');
    if (!href) return;
    const next = decorate(href);
    if (next !== href) anchor.setAttribute('href', next);
  }
  function scan(root) {
    if (root.matches && root.matches('a[href]')) update(root);
    if (root.querySelectorAll) root.querySelectorAll('a[href]').forEach(update);
  }
  // Update existing and dynamically rendered product, cart, and quick-view links.
  scan(document);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') update(record.target);
      else record.addedNodes.forEach(scan);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  for (const event of ['click', 'auxclick', 'contextmenu']) {
    document.addEventListener(event, e => {
      const anchor = e.target.closest && e.target.closest('a[href]');
      if (anchor) update(anchor);
    }, true);
  }
})();
