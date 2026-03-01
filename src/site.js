const STORE_NAME = 'Uncle Apple';
const LOCATION = 'The Gambia';
const WHATSAPP_NUMBER = '4915679652076';

export function buildWhatsAppLink(message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

export function setWhatsAppHref(el, message) {
  if (!el) return;
  el.setAttribute('href', buildWhatsAppLink(message));
  el.setAttribute('target', '_blank');
  el.setAttribute('rel', 'noopener noreferrer');
}

// Back-compat for other modules and inline-free HTML
window.buildWhatsAppLink = buildWhatsAppLink;
window.setWhatsAppHref = setWhatsAppHref;

function initWhatsAppLinks() {
  const defaultMsg = `Hi ${STORE_NAME}! I want to request availability in ${LOCATION}.`;

  setWhatsAppHref(document.getElementById('navWhatsApp'), defaultMsg);
  setWhatsAppHref(document.getElementById('heroChat'), defaultMsg);
  setWhatsAppHref(document.getElementById('contactWhatsApp'), defaultMsg);
  setWhatsAppHref(document.getElementById('footWhatsApp'), defaultMsg);

  document.querySelectorAll('[data-wa-model]').forEach((btn) => {
    const model = btn.getAttribute('data-wa-model');
    const msg = `Hi ${STORE_NAME}! Please confirm availability for: ${model} in ${LOCATION}.`;
    setWhatsAppHref(btn, msg);
  });
}

function initAvailabilityForm() {
  const form = document.getElementById('availabilityForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const model = document.getElementById('model')?.value || 'Not specified';
    const storage = document.getElementById('storage')?.value?.trim() || 'Not specified';
    const color = document.getElementById('color')?.value?.trim() || 'Not specified';
    const condition = document.getElementById('condition')?.value || 'Not specified';
    const delivery = document.getElementById('delivery')?.value || 'Not specified';
    const notes = document.getElementById('notes')?.value?.trim() || '—';

    const msg =
      `Hi ${STORE_NAME}! Please check availability in ${LOCATION}.\n` +
      `Model: ${model}\n` +
      `Storage: ${storage}\n` +
      `Color: ${color}\n` +
      `Condition: ${condition}\n` +
      `Delivery/Pickup: ${delivery}\n` +
      `Notes: ${notes}`;

    window.open(buildWhatsAppLink(msg), '_blank', 'noopener,noreferrer');
  });
}

function initScrollBgRotation() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduceMotion) return;

  const rootStyle = document.documentElement.style;

  const EASE = 0.05;
  const MAX_DEG = 80;
  const STOP_EPS = 0.03;

  let rafId = 0;
  let current = 0;

  function targetAngle() {
    const y = window.scrollY || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, y / maxScroll));
    return progress * MAX_DEG;
  }

  function tick() {
    rafId = 0;
    const target = targetAngle();
    current = current + (target - current) * EASE;

    if (Math.abs(target - current) < STOP_EPS) {
      current = target;
    }

    rootStyle.setProperty('--bg-rot', current.toFixed(2) + 'deg');

    if (Math.abs(target - current) >= STOP_EPS) {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function onScroll() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

function initImageViewer() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  let overlayEl = null;
  let imgEl = null;
  let isOpen = false;
  let prevOverflow = '';

  function ensureOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'image-viewer';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Image viewer');
    overlayEl.setAttribute('hidden', '');

    const backdrop = document.createElement('div');
    backdrop.className = 'image-viewer__backdrop';

    const content = document.createElement('div');
    content.className = 'image-viewer__content';

    imgEl = document.createElement('img');
    imgEl.className = 'image-viewer__img';
    imgEl.loading = 'eager';
    imgEl.decoding = 'async';
    imgEl.alt = '';

    content.appendChild(imgEl);
    overlayEl.appendChild(backdrop);
    overlayEl.appendChild(content);
    document.body.appendChild(overlayEl);

    backdrop.addEventListener('click', () => close());
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });
  }

  function open({ src, alt }) {
    if (!src) return;
    ensureOverlay();

    imgEl.src = src;
    imgEl.alt = alt || 'Product photo';

    overlayEl.removeAttribute('hidden');
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    isOpen = true;

    if (!reduceMotion) {
      overlayEl.classList.add('is-open');
      window.setTimeout(() => overlayEl && overlayEl.classList.add('is-ready'), 0);
    }
  }

  function close() {
    if (!overlayEl || !isOpen) return;
    overlayEl.setAttribute('hidden', '');
    overlayEl.classList.remove('is-open', 'is-ready');
    document.body.style.overflow = prevOverflow;
    isOpen = false;

    if (imgEl) {
      imgEl.src = '';
      imgEl.alt = '';
    }
  }

  window.openImageViewer = open;
  window.closeImageViewer = close;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const img = target.closest('.catalog-frame img');
    if (!img) return;

    const src = img.currentSrc || img.getAttribute('src');
    const alt = img.getAttribute('alt') || '';
    open({ src, alt });
  });
}

initWhatsAppLinks();
initAvailabilityForm();
initScrollBgRotation();
initImageViewer();
