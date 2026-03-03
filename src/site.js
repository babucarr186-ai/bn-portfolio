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
    `<div class="chat-sub">Ask about availability in ${LOCATION}</div>`;

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
    if (/(hi|hello|hey|salam|salaam)/.test(t)) {
      return `Hi! Tell me the model + storage you want (example: iPhone XR 128GB).`;
    }
    if (/(available|availability|in stock|stock)/.test(t)) {
      return `Sure — which model, storage, and color should I check?`;
    }
    if (/(delivery|shipping|pickup|pick up|collection)/.test(t)) {
      return `We can arrange delivery or pickup in ${LOCATION}. Which do you prefer?`;
    }
    if (/(warranty|guarantee|return|refund)/.test(t)) {
      return `Warranty depends on the model. Which iPhone are you interested in?`;
    }
    if (/(price|cost|how much)/.test(t)) {
      return `We share the latest price on WhatsApp. Tell me the exact model + storage and I’ll prepare your message.`;
    }
    if (/(battery)/.test(t)) {
      return `Battery health varies per device. Which iPhone model are you asking about?`;
    }
    return `Got it. Please share: model, storage (e.g. 128GB), and preferred color.`;
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
    const welcome = `Hi! I’m ${STORE_NAME}. Tell me which iPhone you want and I’ll help you request availability.`;
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
initAvailabilityForm();
initScrollBgRotation();
initImageViewer();
initChatWidget();
