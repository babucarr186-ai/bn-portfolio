import { accessories } from './catalog/data/accessories.js';
import { airpods } from './catalog/data/airpods.js';
import { giftCards } from './catalog/data/giftcards.js';
import { ipads } from './catalog/data/ipads.js';
import { iphones } from './catalog/data/iphones.js';
import { macbooks } from './catalog/data/macbooks.js';
import { watches } from './catalog/data/watches.js';

const STORE_NAME = 'Uncle Apple';
const LOCATION = 'The Gambia';
const WHATSAPP_NUMBER = '4915679652076';

const CART_PAGE_HREF = './cart.html';
const CHECKOUT_PAGE_HREF = './checkout.html';
const SELL_DEVICE_HREF = `${import.meta.env.BASE_URL || './'}sell-device/`;

const CHAT_CATEGORY_MAP = {
  iphones: { label: 'iPhones', href: './index.html', terms: ['iphone', 'iphones', 'ios'] },
  ipads: { label: 'iPads', href: './ipads.html', terms: ['ipad', 'ipads'] },
  macbooks: { label: 'MacBooks', href: './macbook.html', terms: ['macbook', 'macbooks', 'mac'] },
  watches: { label: 'Apple Watches', href: './apple-watch.html', terms: ['watch', 'watches', 'apple watch', 'ultra', 'series', 'se'] },
  airpods: { label: 'AirPods', href: './airpods.html', terms: ['airpods', 'airpod', 'max', 'pro buds'] },
  giftcards: { label: 'Gift Cards', href: './gift-cards.html', terms: ['gift card', 'gift cards', 'card', 'cards'] },
  accessories: { label: 'Accessories', href: './accessories.html', terms: ['accessory', 'accessories', 'pencil', 'keyboard', 'mouse', 'adapter', 'charger', 'magsafe'] },
};

const CHAT_PRODUCT_SOURCES = {
  iphones,
  ipads,
  macbooks,
  watches,
  airpods,
  giftcards: giftCards,
  accessories,
};

const CHAT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'available', 'availability', 'can', 'check', 'confirm', 'current', 'currently',
  'do', 'for', 'give', 'got', 'have', 'hello', 'hey', 'hi', 'i', 'in', 'is', 'me', 'need', 'of', 'on', 'please',
  'price', 'prices', 'product', 'products', 'request', 'sell', 'show', 'stock', 'tell', 'the', 'what', 'which', 'with', 'you', 'your',
]);

function normalizeChatText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[–—‑]/g, '-')
    .replace(/[^a-z0-9%+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyChatValue(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatChatPrice(product) {
  if (Number.isFinite(Number(product?.price))) {
    return `GMD ${new Intl.NumberFormat('en-US').format(Number(product.price))}`;
  }
  const subtitle = String(product?.subtitle || '');
  const priceMatch = subtitle.match(/GMD\s*\d[\d,]*/i);
  if (priceMatch) return priceMatch[0].replace(/\s+/g, ' ');
  if (/price on request/i.test(subtitle) || /price on request/i.test(String(product?.description || ''))) {
    return 'Price on request';
  }
  return '';
}

function buildChatSummary(product) {
  const parts = [];
  const subtitle = String(product?.subtitle || '');
  const storageMatch = subtitle.match(/\b\d+(?:\.\d+)?\s*(GB|TB)\b/i) || String(product?.storage || '').match(/\b\d+(?:\.\d+)?\s*(GB|TB)\b/i);
  const conditionMatch = subtitle.match(/brand new|like new|excellent|very clean|clean|good|used/gi) || String(product?.condition || '').match(/brand new|like new|excellent|very clean|clean|good|used/gi);
  const batteryMatch = subtitle.match(/battery\s*\d{2,3}%/i) || String(product?.batteryHealth || '').match(/\d{2,3}%/);

  if (storageMatch) parts.push(storageMatch[0].replace(/\s+/g, ''));
  if (conditionMatch?.[0]) parts.push(conditionMatch[0].replace(/^used\s*[-—]\s*/i, '').replace(/\bcondition\b/gi, '').trim().replace(/^./, (x) => x.toUpperCase()));
  if (batteryMatch?.[0]) parts.push(/battery/i.test(batteryMatch[0]) ? batteryMatch[0].replace(/^./, (x) => x.toUpperCase()) : `Battery ${batteryMatch[0]}`);

  const priceLabel = formatChatPrice(product);
  if (priceLabel) parts.push(priceLabel);
  return parts.filter(Boolean).slice(0, 4).join(' • ');
}

function buildChatInventory() {
  return Object.entries(CHAT_PRODUCT_SOURCES).flatMap(([categoryKey, list]) => {
    const meta = CHAT_CATEGORY_MAP[categoryKey];
    return (Array.isArray(list) ? list : []).map((product, index) => {
      const title = String(product?.title || 'Product');
      const idBase = slugifyChatValue(title) || `product-${index + 1}`;
      const anchor = `product-${idBase}-${index + 1}`;
      const haystack = normalizeChatText([
        title,
        product?.subtitle,
        product?.description,
        product?.productTitle,
        product?.color,
        product?.storage,
        product?.condition,
        product?.warranty,
        meta?.label,
      ].filter(Boolean).join(' '));

      return {
        categoryKey,
        categoryLabel: meta?.label || categoryKey,
        href: `${meta?.href || './'}#${anchor}`,
        title,
        product,
        haystack,
        summary: buildChatSummary(product),
        sold: Boolean(product?.sold),
      };
    });
  });
}

const CHAT_INVENTORY = buildChatInventory();

function detectChatCategory(query) {
  const normalized = normalizeChatText(query);
  return Object.entries(CHAT_CATEGORY_MAP).find(([, meta]) => meta.terms.some((term) => normalized.includes(term)))?.[0] || null;
}

function tokenizeChatQuery(query) {
  return normalizeChatText(query)
    .split(' ')
    .filter((token) => token && !CHAT_STOP_WORDS.has(token));
}

function findChatMatches(query) {
  const tokens = tokenizeChatQuery(query);
  const categoryKey = detectChatCategory(query);

  return CHAT_INVENTORY.map((item) => {
    let score = 0;
    tokens.forEach((token) => {
      if (item.title.toLowerCase().includes(token)) score += 4;
      else if (item.haystack.includes(token)) score += 1;
    });
    if (categoryKey && item.categoryKey === categoryKey) score += 3;
    if (normalizeChatText(query).includes(normalizeChatText(item.title))) score += 8;
    return { item, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function buildChatProductReply(query) {
  const normalized = normalizeChatText(query);
  const categoryKey = detectChatCategory(query);
  const matches = findChatMatches(query);
  const availableMatches = matches.filter((item) => !item.sold);

  if (categoryKey && /(what|which|show|have|available|stock|any)/.test(normalized)) {
    const categoryItems = CHAT_INVENTORY.filter((item) => item.categoryKey === categoryKey && !item.sold).slice(0, 4);
    if (categoryItems.length) {
      const list = categoryItems.map((item) => `${item.title}${item.summary ? ` (${item.summary})` : ''}`).join('; ');
      return `Available ${CHAT_CATEGORY_MAP[categoryKey].label.toLowerCase()} right now: ${list}.`;
    }
  }

  if (availableMatches.length) {
    const top = availableMatches.slice(0, 3);
    if (top.length === 1) {
      const item = top[0];
      return `Yes, ${item.title} is available${item.summary ? `: ${item.summary}` : ''}.`;
    }
    return `Here are the closest available matches: ${top.map((item) => `${item.title}${item.summary ? ` (${item.summary})` : ''}`).join('; ')}.`;
  }

  if (matches.length) {
    const soldItem = matches[0];
    if (soldItem.sold) {
      return `${soldItem.title} is marked sold out right now. I can help you find a similar option if you want.`;
    }
  }

  return '';
}

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

function ensureExtraStyles() {
  const href = `${import.meta.env.BASE_URL || './'}styles.css?v=20260304`;
  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((l) =>
    String(l.getAttribute('href') || '').includes('styles.css'),
  );
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function ensureSellDeviceButton() {
  const existing = document.querySelector('[data-sell-device-link]');
  if (existing) return existing;

  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return null;

  const btn = document.createElement('a');
  btn.href = SELL_DEVICE_HREF;
  btn.className = 'btn btn-primary btn-small';
  btn.setAttribute('data-sell-device-link', '');
  btn.textContent = 'Sell Your Device';

  // Keep the existing look by placing it alongside the other header actions.
  navActions.appendChild(btn);
  return btn;
}

function initHeaderActions() {
  // Some pages rely on this helper for shared styles.
  ensureExtraStyles();

  // Requirement: remove the Cart button from the header navigation.
  const existingCart = document.querySelector('[data-cart-link]');
  if (existingCart) existingCart.remove();

  // Requirement: add “Sell Your Device” button.
  ensureSellDeviceButton();

  // Keep globals for back-compat without injecting any Cart UI.
  window.UA_CART = {
    cartHref: CART_PAGE_HREF,
    checkoutHref: CHECKOUT_PAGE_HREF,
  };
}

function initMobileCategoryNav() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  navLinks.classList.add('nav-links--catbar');

  const iconSvgs = {
    iphones: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="8" y="2.5" width="8" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 5.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    models: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 6.5h6v6H5zM13 6.5h6v6h-6zM5 14.5h6v6H5zM13 14.5h6v6h-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    ipads: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="6" y="3.5" width="12" height="17" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="18" r="0.9" fill="currentColor"/></svg>`,
    macbook: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7 6.5h10a2 2 0 0 1 2 2v6H5v-6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 16.5h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    watch: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="8" y="7" width="8" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.3 7 10 3.5h4L14.7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.3 17 10 20.5h4l.7-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    airpods: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8.2 6.2a2.7 2.7 0 1 1 3.2 2.7v7.1a2.2 2.2 0 1 1-4.4 0v-5.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15.8 6.2a2.7 2.7 0 1 0-3.2 2.7v7.1a2.2 2.2 0 1 0 4.4 0v-5.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    giftcards: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="4.5" y="7" width="15" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 10h15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9.5 7c-.8-1.4-.2-2.8 1.2-2.8 1.5 0 1.9 1.7 1.9 2.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.5 7c.8-1.4.2-2.8-1.2-2.8-1.5 0-1.9 1.7-1.9 2.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    accessories: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7.5 8.5h9a2 2 0 0 1 2 2v3a4.5 4.5 0 0 1-4.5 4.5h-4A4.5 4.5 0 0 1 5.5 13.5v-3a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5V6.5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    tvhome: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="5" y="7" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 19h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    support: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 4a7 7 0 0 1 7 7v2.5a2 2 0 0 1-2 2h-1v-5h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4a7 7 0 0 0-7 7v2.5a2 2 0 0 0 2 2h1v-5H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 19.5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,
    fallback: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
  };

  const pickKey = (label, href) => {
    const text = String(label || '').toLowerCase();
    const url = String(href || '').toLowerCase();
    if (url.includes('#inventory') || text.includes('iphone')) return 'iphones';
    if (text.includes('models') || url.includes('/models')) return 'models';
    if (text.includes('ipad') || url.includes('ipads')) return 'ipads';
    if (text.includes('macbook') || url.includes('macbook')) return 'macbook';
    if (text.includes('watch') || url.includes('apple-watch')) return 'watch';
    if (text.includes('airpods') || url.includes('airpods')) return 'airpods';
    if (text.includes('gift') || url.includes('gift-cards')) return 'giftcards';
    if (text.includes('accessories') || url.includes('accessories')) return 'accessories';
    if (text.includes('tv') || text.includes('home') || url.includes('apple-tv-home')) return 'tvhome';
    if (text.includes('support') || url.includes('/support')) return 'support';
    return 'fallback';
  };

  const current = new URL(window.location.href);
  const normalizePath = (pathname) => {
    if (!pathname) return '/';
    return pathname.endsWith('/index.html') ? pathname.slice(0, -'/index.html'.length) + '/' : pathname;
  };
  const currentPath = normalizePath(current.pathname);

  const anchors = Array.from(navLinks.querySelectorAll('a'));
  anchors.forEach((a) => {
    if (!(a instanceof HTMLAnchorElement)) return;
    if (a.querySelector('.nav-catbar__label')) return;

    const label = a.textContent?.trim() || '';
    const key = pickKey(label, a.getAttribute('href'));
    const svg = iconSvgs[key] || iconSvgs.fallback;

    a.textContent = '';

    const iconEl = document.createElement('span');
    iconEl.className = 'nav-catbar__icon';
    iconEl.innerHTML = svg;

    const labelEl = document.createElement('span');
    labelEl.className = 'nav-catbar__label';
    labelEl.textContent = label;

    a.appendChild(iconEl);
    a.appendChild(labelEl);

    let linkUrl = null;
    try {
      linkUrl = new URL(a.getAttribute('href') || '', current);
    } catch {
      linkUrl = null;
    }

    if (linkUrl) {
      const linkPath = normalizePath(linkUrl.pathname);

      const isSamePage = linkPath === currentPath;
      const isInventoryLink = String(linkUrl.hash || '') === '#inventory';
      const isInventoryPage = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/index');
      const isActive =
        (isSamePage && (!linkUrl.hash || linkUrl.hash === current.hash)) || (isInventoryLink && isInventoryPage);

      if (isActive) a.setAttribute('aria-current', 'page');
    }
  });
}

function initWhatsAppLinks() {
  const customDefaultMsg = document.documentElement?.getAttribute('data-wa-default')?.trim();
  const defaultMsg =
    customDefaultMsg && customDefaultMsg.length > 0
      ? customDefaultMsg
      : `Hi ${STORE_NAME}! I want to request availability in ${LOCATION}.`;

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


function initImageViewer() {
  let overlayEl = null;
  let contentEl = null;
  let viewportEl = null;
  let trackEl = null;
  let dotsEl = null;
  let counterEl = null;
  let closeBtnEl = null;
  let prevBtnEl = null;
  let nextBtnEl = null;
  let slideImages = [];
  let isOpen = false;
  let lockedScrollY = 0;
  let bodyInlineStyles = null;

  let gallerySources = [];
  let galleryIndex = 0;
  let galleryAlt = 'Product photo';

  let activeGestureType = '';
  let pointerId = null;
  let touchId = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let dragOffsetX = 0;
  let gestureAxis = '';
  let isTracking = false;
  let isAnimating = false;
  let gestureFrame = 0;
  let animationTimer = 0;

  const TRACK_PREV = 0;
  const TRACK_CENTER = 1;
  const TRACK_NEXT = 2;

  function clearAnimationTimer() {
    if (!animationTimer) return;
    window.clearTimeout(animationTimer);
    animationTimer = 0;
  }

  function getTrackWidth() {
    return viewportEl?.clientWidth || contentEl?.clientWidth || window.innerWidth || 1;
  }

  function setTrackPosition(slot, offsetX = 0) {
    if (!trackEl) return;
    const width = getTrackWidth();
    const baseOffset = -width * slot;
    trackEl.style.transform = `translate3d(${baseOffset + offsetX}px, 0, 0)`;
  }

  function lockBodyScroll() {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    bodyInlineStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      left: document.body.style.left,
      right: document.body.style.right,
      overflow: document.body.style.overflow,
    };

    document.body.classList.add('image-viewer-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overflowX = 'hidden';
  }

  function unlockBodyScroll() {
    document.body.classList.remove('image-viewer-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    document.body.style.overflowX = '';
    bodyInlineStyles = null;
    window.scrollTo({ top: lockedScrollY, behavior: 'auto' });
  }

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

    contentEl = document.createElement('div');
    contentEl.className = 'image-viewer__content';

    closeBtnEl = document.createElement('button');
    closeBtnEl.type = 'button';
    closeBtnEl.className = 'image-viewer__close';
    closeBtnEl.setAttribute('aria-label', 'Close image');
    closeBtnEl.textContent = 'Close';

    prevBtnEl = document.createElement('button');
    prevBtnEl.type = 'button';
    prevBtnEl.className = 'image-viewer__nav image-viewer__nav--prev';
    prevBtnEl.setAttribute('aria-label', 'Previous image');
    prevBtnEl.textContent = '‹';

    nextBtnEl = document.createElement('button');
    nextBtnEl.type = 'button';
    nextBtnEl.className = 'image-viewer__nav image-viewer__nav--next';
    nextBtnEl.setAttribute('aria-label', 'Next image');
    nextBtnEl.textContent = '›';

    counterEl = document.createElement('div');
    counterEl.className = 'image-viewer__counter';
    counterEl.setAttribute('aria-live', 'polite');

    viewportEl = document.createElement('div');
    viewportEl.className = 'image-viewer__viewport';

    trackEl = document.createElement('div');
    trackEl.className = 'image-viewer__track';

    slideImages = [-1, 0, 1].map(() => {
      const slideEl = document.createElement('div');
      slideEl.className = 'image-viewer__slide';
      const imgEl = document.createElement('img');
      imgEl.className = 'image-viewer__img';
      imgEl.loading = 'lazy';
      imgEl.decoding = 'async';
      imgEl.alt = '';
      imgEl.draggable = false;
      slideEl.appendChild(imgEl);
      trackEl.appendChild(slideEl);
      return imgEl;
    });

    dotsEl = document.createElement('div');
    dotsEl.className = 'image-viewer__dots';
    dotsEl.setAttribute('role', 'tablist');
    dotsEl.setAttribute('aria-label', 'Image navigation');

    viewportEl.appendChild(trackEl);
    contentEl.appendChild(closeBtnEl);
    contentEl.appendChild(counterEl);
    contentEl.appendChild(prevBtnEl);
    contentEl.appendChild(nextBtnEl);
    contentEl.appendChild(viewportEl);
    contentEl.appendChild(dotsEl);
    overlayEl.appendChild(backdrop);
    overlayEl.appendChild(contentEl);
    document.body.appendChild(overlayEl);

    backdrop.addEventListener('click', () => close());
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    closeBtnEl.addEventListener('click', close);
    prevBtnEl.addEventListener('click', prev);
    nextBtnEl.addEventListener('click', next);

    viewportEl.addEventListener('pointerdown', (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!beginSwipe({ clientX: e.clientX, clientY: e.clientY, gestureType: 'pointer', identifier: e.pointerId })) return;

      try {
        viewportEl.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });

    viewportEl.addEventListener('pointermove', (e) => {
      if (!(e instanceof PointerEvent) || e.pointerType === 'touch') return;
      updateSwipe({ clientX: e.clientX, clientY: e.clientY, gestureType: 'pointer', identifier: e.pointerId });
    });

    viewportEl.addEventListener('pointerup', (e) => {
      if (!(e instanceof PointerEvent) || e.pointerType === 'touch') return;
      finishSwipe({ clientX: e.clientX, gestureType: 'pointer', identifier: e.pointerId });
      try {
        viewportEl.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });

    viewportEl.addEventListener('pointercancel', (e) => {
      if (!(e instanceof PointerEvent) || e.pointerType === 'touch') return;
      finishSwipe({ clientX: e.clientX, gestureType: 'pointer', identifier: e.pointerId });
      try {
        viewportEl.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });

    viewportEl.addEventListener('pointerleave', (e) => {
      if (!(e instanceof PointerEvent) || e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse') return;
      finishSwipe({ clientX: e.clientX, gestureType: 'pointer', identifier: e.pointerId });
      try {
        viewportEl.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });

    viewportEl.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.changedTouches[0];
      beginSwipe({ clientX: touch.clientX, clientY: touch.clientY, gestureType: 'touch', identifier: touch.identifier });
    }, { passive: true });

    viewportEl.addEventListener('touchmove', (e) => {
      const touch = findTouch(e.changedTouches, touchId);
      if (!touch) return;
      updateSwipe({ clientX: touch.clientX, clientY: touch.clientY, gestureType: 'touch', identifier: touch.identifier, preventDefault: () => e.preventDefault() });
    }, { passive: false });

    viewportEl.addEventListener('touchend', (e) => {
      const touch = findTouch(e.changedTouches, touchId);
      if (!touch) return;
      finishSwipe({ clientX: touch.clientX, gestureType: 'touch', identifier: touch.identifier });
    }, { passive: true });

    viewportEl.addEventListener('touchcancel', (e) => {
      const touch = findTouch(e.changedTouches, touchId);
      if (!touch) {
        resetGestureState();
        snapBack();
        return;
      }
      finishSwipe({ clientX: touch.clientX, gestureType: 'touch', identifier: touch.identifier });
    }, { passive: true });
  }

  function shouldAutoFocusViewerControl() {
    return !((navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches);
  }

  function getSwipeThresholds(width) {
    const isCoarsePointer = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches;
    return isCoarsePointer
      ? { distance: Math.max(40, width * 0.1), velocity: 0.4, minFlickDistance: 12 }
      : { distance: Math.max(56, width * 0.14), velocity: 0.55, minFlickDistance: 18 };
  }

  function findTouch(touchList, identifier) {
    if (identifier === null || identifier === undefined) return null;
    for (const touch of touchList) {
      if (touch.identifier === identifier) return touch;
    }
    return null;
  }

  function resetGestureState() {
    activeGestureType = '';
    pointerId = null;
    touchId = null;
    isTracking = false;
    gestureAxis = '';
  }

  function beginSwipe({ clientX, clientY, gestureType, identifier }) {
    if (!isOpen || gallerySources.length <= 1 || isAnimating) return false;
    if (isTracking && activeGestureType && activeGestureType !== gestureType) return false;

    clearAnimationTimer();
    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }

    activeGestureType = gestureType;
    pointerId = gestureType === 'pointer' ? identifier : null;
    touchId = gestureType === 'touch' ? identifier : null;
    startX = clientX;
    startY = clientY;
    startTime = window.performance.now();
    dragOffsetX = 0;
    gestureAxis = '';
    isTracking = true;
    if (trackEl) trackEl.style.transition = 'none';
    return true;
  }

  function updateSwipe({ clientX, clientY, gestureType, identifier, preventDefault }) {
    if (!isOpen || !isTracking || isAnimating || activeGestureType !== gestureType) return;
    if (gestureType === 'pointer' && pointerId !== identifier) return;
    if (gestureType === 'touch' && touchId !== identifier) return;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (!gestureAxis && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      gestureAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    }

    if (gestureAxis === 'y') return;
    if (gestureAxis !== 'x') return;

    preventDefault?.();
    dragOffsetX = deltaX;
    applyDragOffset(deltaX);
  }

  function clampIndex(nextIndex) {
    const max = Math.max(0, gallerySources.length - 1);
    return Math.max(0, Math.min(max, nextIndex));
  }

  function clearSlides() {
    slideImages.forEach((imgEl) => {
      imgEl.removeAttribute('src');
      imgEl.removeAttribute('data-src');
      imgEl.alt = '';
    });
  }

  function syncDots() {
    if (!dotsEl) return;
    Array.from(dotsEl.children).forEach((dotEl, dotIndex) => {
      const active = dotIndex === galleryIndex;
      dotEl.setAttribute('aria-current', active ? 'true' : 'false');
      dotEl.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function syncCounter() {
    if (!counterEl) return;
    counterEl.hidden = !gallerySources.length;
    counterEl.textContent = gallerySources.length ? `${galleryIndex + 1} / ${gallerySources.length}` : '';
  }

  function syncControls() {
    const multiple = gallerySources.length > 1;
    const atFirst = galleryIndex <= 0;
    const atLast = galleryIndex >= gallerySources.length - 1;

    if (prevBtnEl) {
      prevBtnEl.hidden = !multiple;
      prevBtnEl.disabled = !multiple || atFirst;
    }

    if (nextBtnEl) {
      nextBtnEl.hidden = !multiple;
      nextBtnEl.disabled = !multiple || atLast;
    }

    if (dotsEl) dotsEl.hidden = !multiple;
  }

  function renderDots() {
    if (!dotsEl) return;
    dotsEl.textContent = '';

    if (gallerySources.length <= 1) {
      dotsEl.hidden = true;
      return;
    }

    dotsEl.hidden = false;
    gallerySources.forEach((_, dotIndex) => {
      const dotEl = document.createElement('button');
      dotEl.type = 'button';
      dotEl.className = 'image-viewer__dot';
      dotEl.setAttribute('role', 'tab');
      dotEl.setAttribute('aria-label', `View image ${dotIndex + 1}`);
      dotEl.addEventListener('click', () => setImage(dotIndex));
      dotsEl.appendChild(dotEl);
    });
  }

  function renderTrackImages() {
    if (!slideImages.length || !gallerySources.length) return;

    slideImages.forEach((imgEl, slotIndex) => {
      const relativeOffset = slotIndex - 1;
      const sourceIndex = galleryIndex + relativeOffset;
      const src = gallerySources[sourceIndex] || '';

      if (!src) {
        imgEl.removeAttribute('src');
        imgEl.removeAttribute('data-src');
        imgEl.alt = '';
        return;
      }

      if (imgEl.dataset.src !== src) {
        imgEl.src = src;
        imgEl.dataset.src = src;
      }

      imgEl.loading = slotIndex === 1 ? 'eager' : 'lazy';
      imgEl.alt = `${galleryAlt || 'Product photo'} (${sourceIndex + 1} of ${gallerySources.length})`;
    });

    if (trackEl) {
      trackEl.style.transition = 'none';
      setTrackPosition(TRACK_CENTER, 0);
      window.requestAnimationFrame(() => {
        if (!trackEl || !isOpen || isTracking) return;
        trackEl.style.transition = '';
      });
    }

    syncDots();
    syncCounter();
    syncControls();
    preloadAround(galleryIndex);
  }

  function resetTrackPosition() {
    dragOffsetX = 0;
    clearAnimationTimer();

    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }

    if (trackEl) {
      trackEl.style.transition = '';
      setTrackPosition(TRACK_CENTER, 0);
    }
  }

  function applyDragOffset(offsetX) {
    if (gestureFrame) return;

    gestureFrame = window.requestAnimationFrame(() => {
      gestureFrame = 0;
      const width = contentEl?.clientWidth || window.innerWidth || 1;
      const limitedOffset = Math.max(-width * 0.9, Math.min(width * 0.9, applyEdgeResistance(offsetX, width)));
      if (!trackEl) return;
      trackEl.style.transition = 'none';
      setTrackPosition(TRACK_CENTER, limitedOffset);
    });
  }

  function applyEdgeResistance(offsetX, width) {
    const atFirst = galleryIndex <= 0;
    const atLast = galleryIndex >= gallerySources.length - 1;
    const isPullingPastFirst = atFirst && offsetX > 0;
    const isPullingPastLast = atLast && offsetX < 0;

    if (!isPullingPastFirst && !isPullingPastLast) return offsetX;

    const distance = Math.abs(offsetX);
    const resistedDistance = Math.min(width * 0.22, distance * 0.38);
    return Math.sign(offsetX) * resistedDistance;
  }

  function snapBack() {
    if (!trackEl) return;
    trackEl.style.transition = 'transform 200ms ease';
    setTrackPosition(TRACK_CENTER, 0);
    clearAnimationTimer();
    animationTimer = window.setTimeout(() => {
      animationTimer = 0;
      if (trackEl && isOpen) trackEl.style.transition = '';
    }, 200);
  }

  function animateToImage(direction) {
    if (!trackEl || !gallerySources.length || gallerySources.length <= 1 || isAnimating) return;

    const targetIndex = clampIndex(galleryIndex + direction);
    if (targetIndex === galleryIndex) {
      snapBack();
      return;
    }

    isAnimating = true;
    isTracking = false;
    dragOffsetX = 0;
    clearAnimationTimer();
    trackEl.style.transition = 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)';
    setTrackPosition(direction > 0 ? TRACK_NEXT : TRACK_PREV, 0);

    animationTimer = window.setTimeout(() => {
      animationTimer = 0;
      if (!isOpen) {
        isAnimating = false;
        return;
      }

      galleryIndex = targetIndex;
      renderTrackImages();
      isAnimating = false;
    }, 220);
  }

  function preloadAround(index) {
    const prevIndex = index - 1;
    const nextIndex = index + 1;
    [prevIndex, nextIndex].forEach((i) => {
      const src = gallerySources[i];
      if (!src) return;
      const pre = new Image();
      pre.decoding = 'async';
      pre.src = src;
    });
  }

  function setImage(index) {
    galleryIndex = clampIndex(index);
    renderTrackImages();
  }

  function openGallery({ sources, index, alt }) {
    const cleaned = Array.isArray(sources) ? sources.filter(Boolean) : [];
    if (!cleaned.length) return;

    ensureOverlay();

    gallerySources = Array.from(new Set(cleaned));
    galleryAlt = alt || 'Product photo';
    galleryIndex = clampIndex(typeof index === 'number' ? index : 0);

    renderDots();

    overlayEl.removeAttribute('hidden');
    document.addEventListener('keydown', onDocumentKeydown);
    lockBodyScroll();
    isOpen = true;
    setImage(galleryIndex);
    if (closeBtnEl && shouldAutoFocusViewerControl()) {
      closeBtnEl.focus({ preventScroll: true });
    }
  }

  function next() {
    if (!isOpen) return;
    animateToImage(1);
  }

  function prev() {
    if (!isOpen) return;
    animateToImage(-1);
  }

  function open(payload) {
    if (!payload) return;
    if (Array.isArray(payload.sources) && payload.sources.length) {
      openGallery({ sources: payload.sources, index: payload.index || 0, alt: payload.alt });
      return;
    }
    if (payload.src) {
      openGallery({ sources: [payload.src], index: 0, alt: payload.alt });
    }
  }

  function onDocumentKeydown(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }

  function close() {
    if (!overlayEl || !isOpen) return;
    isOpen = false;
    isAnimating = false;
    resetGestureState();
    clearAnimationTimer();
    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }
    unlockBodyScroll();
    document.removeEventListener('keydown', onDocumentKeydown);
    overlayEl.remove();
    overlayEl = null;
    contentEl = null;
    viewportEl = null;
    trackEl = null;
    dotsEl = null;
    counterEl = null;
    closeBtnEl = null;
    prevBtnEl = null;
    nextBtnEl = null;
    slideImages = [];
    gallerySources = [];
    galleryIndex = 0;
    galleryAlt = 'Product photo';
  }

  function finishSwipe({ clientX, gestureType, identifier } = {}) {
    if (!isTracking) return;
    if (gestureType && activeGestureType && gestureType !== activeGestureType) return;
    if (gestureType === 'pointer' && pointerId !== null && identifier !== pointerId) return;
    if (gestureType === 'touch' && touchId !== null && identifier !== touchId) return;

    const resolvedClientX = clientX ?? startX + dragOffsetX;
    const width = contentEl?.clientWidth || window.innerWidth || 1;
    const elapsed = Math.max((window.performance.now() - startTime) || 1, 1);
    const velocityX = dragOffsetX / elapsed;
    const thresholds = getSwipeThresholds(width);
    const shouldNavigate =
      gestureAxis === 'x' &&
      (Math.abs(dragOffsetX) > thresholds.distance ||
        (Math.abs(velocityX) > thresholds.velocity && Math.abs(dragOffsetX) > thresholds.minFlickDistance));

    dragOffsetX = resolvedClientX - startX;
    resetGestureState();

    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }

    if (shouldNavigate) {
      animateToImage(dragOffsetX < 0 ? 1 : -1);
      return;
    }

    snapBack();
  }

  window.openImageViewer = open;
  window.closeImageViewer = close;

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Skip clicks handled by the catalog lightbox's own zoom button
    if (target.closest('.catalog-zoom')) return;

    const img = target.closest('.catalog-frame img');
    if (!img) return;

    const card = img.closest('.catalog-card');
    const alt = img.getAttribute('alt') || '';

    let sources = [];
    if (card) {
      sources = Array.from(card.querySelectorAll('.catalog-thumbs img'))
        .map((node) => node.currentSrc || node.getAttribute('src') || '')
        .filter(Boolean);
    }

    const clickedSrc = img.currentSrc || img.getAttribute('src') || '';
    if (!sources.length && clickedSrc) sources = [clickedSrc];
    if (sources.length && clickedSrc && !sources.includes(clickedSrc)) sources.unshift(clickedSrc);

    const initialIndex = Math.max(0, sources.indexOf(clickedSrc));
    open({ sources, index: initialIndex, alt });
  });
}

function initChatWidget() {
  if (document.getElementById('uaChatWidget')) return;

  const container = document.createElement('div');
  container.id = 'uaChatWidget';

  const panel = document.createElement('section');
  panel.className = 'chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with Uncle Apple');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'chat-header';
  header.innerHTML =
    '<div class="chat-title">Chat</div>' +
    `<div class="chat-sub">Ask about available products in ${LOCATION}</div>`;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'chat-close';
  closeBtn.setAttribute('aria-label', 'Close chat');
  closeBtn.textContent = '×';
  header.appendChild(closeBtn);

  const list = document.createElement('div');
  list.className = 'chat-list';
  list.setAttribute('role', 'log');
  list.setAttribute('aria-live', 'polite');

  const footer = document.createElement('div');
  footer.className = 'chat-footer';

  const input = document.createElement('input');
  input.className = 'chat-input';
  input.type = 'text';
  input.placeholder = 'Type your message…';
  input.autocomplete = 'off';
  input.inputMode = 'text';
  input.setAttribute('aria-label', 'Chat message');

  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'btn btn-primary btn-small chat-send';
  sendBtn.textContent = 'Send';

  const waBtn = document.createElement('a');
  waBtn.className = 'btn btn-outline btn-small chat-wa';
  waBtn.href = '#';
  waBtn.textContent = 'WhatsApp';

  footer.appendChild(input);
  footer.appendChild(sendBtn);
  footer.appendChild(waBtn);

  panel.appendChild(header);
  panel.appendChild(list);
  panel.appendChild(footer);

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'btn btn-primary btn-small chat-fab';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'uaChatPanel');
  fab.textContent = 'Chat';

  panel.id = 'uaChatPanel';

  container.appendChild(panel);
  container.appendChild(fab);
  document.body.appendChild(container);

  function scrollToBottom() {
    list.scrollTop = list.scrollHeight;
  }

  function addMessage(from, text) {
    const row = document.createElement('div');
    row.className = `chat-msg ${from === 'user' ? 'chat-msg--user' : 'chat-msg--bot'}`;
    row.textContent = text;
    list.appendChild(row);
    scrollToBottom();
  }

  const storageKey = 'ua_chat_messages_v1';
  const messages = [];
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.slice(0, 80).forEach((m) => {
          if (!m || typeof m.text !== 'string') return;
          const from = m.from === 'user' ? 'user' : 'bot';
          messages.push({ from, text: m.text });
        });
      }
    }
  } catch {
    // ignore
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-80)));
    } catch {
      // ignore
    }
  }

  function botReply(text) {
    const t = String(text || '').toLowerCase();
    const productReply = buildChatProductReply(text);
    if (productReply) return productReply;

    if (/(hi|hello|hey|salam|salaam)/.test(t)) {
      return `Hi! Ask for any product you want, for example: iPhone XR 128GB, iPad 10th gen, AirPods Pro 2, or MacBook Pro.`;
    }
    if (/(available|availability|in stock|stock)/.test(t)) {
      return `Sure — tell me the model or category you want, and I’ll check what is currently available.`;
    }
    if (/(delivery|shipping|pickup|pick up|collection)/.test(t)) {
      return `We can arrange delivery or pickup in ${LOCATION}. Which do you prefer?`;
    }
    if (/(warranty|guarantee|return|refund)/.test(t)) {
      return `Warranty depends on the model. Which iPhone are you interested in?`;
    }
    if (/(price|cost|how much)/.test(t)) {
      return `Tell me the exact product name and I’ll share the current listing details if the price is shown.`;
    }
    if (/(battery)/.test(t)) {
      return `Battery health depends on the exact listing. Tell me the exact model and I’ll check the current inventory.`;
    }
    return `Tell me the exact product or category you want, like iPhone 14 Pro, iPads, AirPods, MacBooks, Watches, gift cards, or accessories.`;
  }

  function exportToWhatsApp() {
    const transcript = messages
      .slice(-40)
      .map((m) => `${m.from === 'user' ? 'You' : STORE_NAME}: ${m.text}`)
      .join('\n');
    const msg = `Hi ${STORE_NAME}! Here is my chat message for availability in ${LOCATION}:\n\n${transcript}`;
    setWhatsAppHref(waBtn, msg);
  }

  function renderInitial() {
    list.textContent = '';
    if (messages.length) {
      messages.forEach((m) => addMessage(m.from, m.text));
      return;
    }
    const welcome = `Hi! I’m ${STORE_NAME}. Ask me about any available product and I’ll check the current inventory for you.`;
    messages.push({ from: 'bot', text: welcome });
    addMessage('bot', welcome);
    persist();
  }

  function open() {
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    exportToWhatsApp();
    window.setTimeout(() => input.focus(), 0);
  }

  function close() {
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    const isHidden = panel.getAttribute('aria-hidden') === 'true';
    if (isHidden) open();
    else close();
  }

  function send() {
    const text = String(input.value || '').trim();
    if (!text) return;

    messages.push({ from: 'user', text });
    addMessage('user', text);
    input.value = '';

    const reply = botReply(text);
    messages.push({ from: 'bot', text: reply });
    window.setTimeout(() => {
      addMessage('bot', reply);
      persist();
      exportToWhatsApp();
    }, 250);
  }

  fab.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  sendBtn.addEventListener('click', send);
  waBtn.addEventListener('click', (e) => {
    exportToWhatsApp();
    const href = waBtn.getAttribute('href');
    if (!href || href === '#') e.preventDefault();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    send();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (panel.getAttribute('aria-hidden') === 'true') return;
    close();
  });

  renderInitial();
}

initWhatsAppLinks();
initHeaderActions();
initMobileCategoryNav();
initAvailabilityForm();
initImageViewer();
initChatWidget();
