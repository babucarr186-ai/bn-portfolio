import { accessories } from './catalog/data/accessories.js';
import { airpods } from './catalog/data/airpods.js';
import { giftCards } from './catalog/data/giftcards.js';
import { ipads } from './catalog/data/ipads.js';
import { iphones } from './catalog/data/iphones.js';
import { macbooks } from './catalog/data/macbooks.js';
import { watches } from './catalog/data/watches.js';

// Global safety net: catch uncaught errors and unhandled promise rejections on
// non-React pages so a single runtime error doesn't silently freeze the UI.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (import.meta.env.DEV) {
      console.error('[site] Uncaught error:', event.error || event.message);
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (import.meta.env.DEV) {
      console.error('[site] Unhandled promise rejection:', event.reason);
    }
  });
}

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

  let pointerId = null;
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
  }

  function unlockBodyScroll() {
    document.body.classList.remove('image-viewer-open');

    if (bodyInlineStyles) {
      document.body.style.position = bodyInlineStyles.position;
      document.body.style.top = bodyInlineStyles.top;
      document.body.style.width = bodyInlineStyles.width;
      document.body.style.left = bodyInlineStyles.left;
      document.body.style.right = bodyInlineStyles.right;
      document.body.style.overflow = bodyInlineStyles.overflow;
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
    }

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

    contentEl.addEventListener('pointerdown', (e) => {
      if (!isOpen || gallerySources.length <= 1 || isAnimating) return;
      if (!(e instanceof PointerEvent)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startTime = window.performance.now();
      dragOffsetX = 0;
      gestureAxis = '';
      isTracking = true;
      if (trackEl) trackEl.style.transition = 'none';

      try {
        contentEl.setPointerCapture(pointerId);
      } catch {
        // ignore
      }
    });

    contentEl.addEventListener('pointermove', (e) => {
      if (!isOpen || !isTracking || pointerId !== e.pointerId || isAnimating) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (!gestureAxis && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
        gestureAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
      }

      if (gestureAxis === 'y') return;
      if (gestureAxis !== 'x') return;

      e.preventDefault();
      dragOffsetX = deltaX;
      applyDragOffset(deltaX);
    });

    contentEl.addEventListener('pointerup', finishSwipe);
    contentEl.addEventListener('pointercancel', finishSwipe);
    contentEl.addEventListener('pointerleave', (e) => {
      if (!isTracking || e.pointerType === 'mouse') return;
      finishSwipe(e);
    });
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
        if (trackEl && isOpen) trackEl.style.transition = '';
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
      const limitedOffset = Math.max(-width * 0.9, Math.min(width * 0.9, offsetX));
      if (!trackEl) return;
      trackEl.style.transition = 'none';
      setTrackPosition(TRACK_CENTER, limitedOffset);
    });
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
    lockBodyScroll();
    isOpen = true;
    setImage(galleryIndex);
    if (closeBtnEl) closeBtnEl.focus();
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

  function close() {
    if (!overlayEl || !isOpen) return;
    overlayEl.setAttribute('hidden', '');
    isOpen = false;
    isTracking = false;
    isAnimating = false;
    pointerId = null;
    gestureAxis = '';
    resetTrackPosition();
    unlockBodyScroll();

    gallerySources = [];
    galleryIndex = 0;
    galleryAlt = 'Product photo';
    if (dotsEl) dotsEl.textContent = '';
    if (counterEl) {
      counterEl.textContent = '';
      counterEl.hidden = true;
    }
    clearSlides();
  }

  function finishSwipe(e) {
    if (!isTracking || (e && pointerId !== null && e.pointerId !== pointerId)) return;

    const clientX = e?.clientX ?? startX + dragOffsetX;
    const width = contentEl?.clientWidth || window.innerWidth || 1;
    const elapsed = Math.max((window.performance.now() - startTime) || 1, 1);
    const velocityX = dragOffsetX / elapsed;
    const shouldNavigate =
      gestureAxis === 'x' &&
      (Math.abs(dragOffsetX) > Math.max(56, width * 0.14) ||
        (Math.abs(velocityX) > 0.55 && Math.abs(dragOffsetX) > 18));

    try {
      if (pointerId !== null && contentEl) contentEl.releasePointerCapture(pointerId);
    } catch {
      // ignore
    }

    isTracking = false;
    pointerId = null;
    gestureAxis = '';
    dragOffsetX = clientX - startX;

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

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

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

// Guard each init so one failure does not prevent the rest from running.
[
  ['initWhatsAppLinks', initWhatsAppLinks],
  ['initHeaderActions', initHeaderActions],
  ['initAvailabilityForm', initAvailabilityForm],
  ['initScrollBgRotation', initScrollBgRotation],
  ['initImageViewer', initImageViewer],
  ['initChatWidget', initChatWidget],
].forEach(([name, fn]) => {
  try {
    fn();
  } catch (e) {
    if (import.meta.env.DEV) console.error(`[site] ${name} failed:`, e);
  }
});
