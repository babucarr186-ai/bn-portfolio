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
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  let overlayEl = null;
  let imgEl = null;
  let isOpen = false;
  let prevOverflow = '';

  let gallerySources = [];
  let galleryIndex = 0;
  let galleryAlt = 'Product photo';

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let isTracking = false;

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
    content.addEventListener('click', (e) => {
      if (e.target !== content) return;
      close();
    });
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    // Swipe navigation (touch + pen + mouse drag)
    content.addEventListener(
      'pointerdown',
      (e) => {
        if (!isOpen) return;
        if (!(e instanceof PointerEvent)) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        isTracking = true;
        try {
          content.setPointerCapture(pointerId);
        } catch {
          // ignore
        }
      },
      { passive: true },
    );

    content.addEventListener(
      'pointerup',
      (e) => {
        if (!isOpen || !isTracking) return;
        if (pointerId !== null && e.pointerId !== pointerId) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Horizontal swipe threshold
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          if (dx < 0) next();
          else prev();
        }

        isTracking = false;
        pointerId = null;
      },
      { passive: true },
    );

    content.addEventListener(
      'pointercancel',
      (e) => {
        if (pointerId !== null && e.pointerId !== pointerId) return;
        isTracking = false;
        pointerId = null;
      },
      { passive: true },
    );
  }

  function clampIndex(nextIndex) {
    const max = Math.max(0, gallerySources.length - 1);
    return Math.max(0, Math.min(max, nextIndex));
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
    if (!imgEl) return;
    galleryIndex = clampIndex(index);
    const src = gallerySources[galleryIndex];
    if (!src) return;

    imgEl.alt = galleryAlt;

    if (reduceMotion) {
      imgEl.src = src;
      preloadAround(galleryIndex);
      return;
    }

    imgEl.style.transition = 'opacity 120ms ease';
    imgEl.style.opacity = '0';
    window.setTimeout(() => {
      if (!imgEl || !isOpen) return;
      imgEl.src = src;
      imgEl.style.opacity = '1';
      preloadAround(galleryIndex);
    }, 110);
  }

  function openGallery({ sources, index, alt }) {
    const cleaned = Array.isArray(sources) ? sources.filter(Boolean) : [];
    if (!cleaned.length) return;

    ensureOverlay();

    gallerySources = Array.from(new Set(cleaned));
    galleryAlt = alt || 'Product photo';

    overlayEl.removeAttribute('hidden');
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    isOpen = true;

    if (!reduceMotion) {
      overlayEl.classList.add('is-open');
      window.setTimeout(() => overlayEl && overlayEl.classList.add('is-ready'), 0);
    }

    setImage(typeof index === 'number' ? index : 0);
  }

  function next() {
    if (!isOpen) return;
    setImage(galleryIndex + 1);
  }

  function prev() {
    if (!isOpen) return;
    setImage(galleryIndex - 1);
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
    overlayEl.classList.remove('is-open', 'is-ready');
    document.body.style.overflow = prevOverflow;
    isOpen = false;

    gallerySources = [];
    galleryIndex = 0;
    galleryAlt = 'Product photo';

    if (imgEl) {
      imgEl.src = '';
      imgEl.alt = '';
    }
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

initWhatsAppLinks();
initHeaderActions();
initAvailabilityForm();
initScrollBgRotation();
initImageViewer();
initChatWidget();
