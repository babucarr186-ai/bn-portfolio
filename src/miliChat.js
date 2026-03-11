const BOT_NAME = 'Mili';

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'do',
  'you',
  'have',
  'is',
  'are',
  'the',
  'a',
  'an',
  'available',
  'still',
  'in',
  'stock',
  'please',
  'can',
  'i',
  'me',
  'tell',
  'about',
  'from',
  'uncle',
  'apple',
  'store',
  'hello',
  'hi',
  'hey',
  'want',
  'to',
  'buy',
  'this',
  'product',
  'model',
]);

function tokenizeQuery(text) {
  const n = normalize(text);
  const raw = n.split(' ').filter(Boolean);
  const tokens = raw.filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  // Keep duplicates out.
  return Array.from(new Set(tokens));
}

function getInventoryItemsFromDom() {
  const cards = Array.from(document.querySelectorAll('.catalog-card'));
  return cards
    .map((card) => {
      const title = (card.dataset.title || '').trim();
      const subtitle = (card.dataset.subtitle || '').trim();
      const search = (card.dataset.search || `${title} ${subtitle}`).trim().toLowerCase();
      if (!title) return null;
      return { title, subtitle, search };
    })
    .filter(Boolean);
}

function findInventoryMatch(question) {
  const items = getInventoryItemsFromDom();
  if (!items.length) return { status: 'unknown-page' };

  const qNorm = normalize(question);
  const qTokens = tokenizeQuery(question);

  // Direct contains match first (best UX for exact model strings).
  const direct = items.find((it) => qNorm.includes(normalize(it.title)));
  if (direct) return { status: 'found', item: direct };

  // Token scoring: count how many query tokens appear in the inventory item's searchable text.
  if (!qTokens.length) return { status: 'not-found' };

  let best = null;
  let bestScore = 0;

  for (const it of items) {
    let score = 0;
    for (const t of qTokens) {
      if (it.search.includes(t)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }

  // Require a meaningful match: either 2+ tokens matched, or a single strong token that isn't too generic.
  const GENERIC_SINGLE = new Set(['iphone', 'macbook', 'ipad', 'watch', 'airpods', 'accessories']);
  if (best && (bestScore >= 2 || (bestScore === 1 && qTokens.length === 1 && !GENERIC_SINGLE.has(qTokens[0])))) {
    return { status: 'found', item: best };
  }

  // Allow a single token match for common product-family queries (e.g., “AirPods”).
  if (best && bestScore === 1 && qTokens.length === 1 && GENERIC_SINGLE.has(qTokens[0])) {
    return { status: 'found', item: best };
  }

  return { status: 'not-found' };
}

function buildWhatsAppHref(message) {
  const msg = String(message || '').trim();

  // Prefer the site's existing integration if available.
  if (typeof window.buildWhatsAppLink === 'function') {
    return window.buildWhatsAppLink(msg);
  }

  // Fallback: use the already-populated nav WhatsApp link if it exists.
  const nav = document.getElementById('navWhatsApp');
  const navHref = nav?.getAttribute('href') || nav?.href;
  if (navHref && String(navHref).includes('wa.me')) {
    try {
      const url = new URL(navHref, window.location.href);
      if (msg) url.searchParams.set('text', msg);
      return url.toString();
    } catch {
      return navHref;
    }
  }

  // Last-resort fallback (should rarely be used).
  const encoded = encodeURIComponent(msg);
  return `https://wa.me/4915679652076?text=${encoded}`;
}

function injectStyles() {
  if (document.getElementById('mili-chat-styles')) return;

  const style = document.createElement('style');
  style.id = 'mili-chat-styles';
  style.textContent = `
    .mili-fab{ position:fixed; right:14px; bottom:14px; z-index:80; }
    .mili-fab button{
      border: 1px solid rgba(11,15,22,0.14);
      background: rgba(255,255,255,0.92);
      color: rgba(11,15,22,0.95);
      padding: 11px 14px;
      border-radius: 999px;
      font: inherit;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      box-shadow: 0 18px 50px rgba(0,0,0,0.08);
      backdrop-filter: blur(10px);
    }
    .mili-fab button:hover{ background: rgba(255,255,255,0.98); }

    .mili-panel{
      position: fixed;
      right: 14px;
      bottom: 72px;
      z-index: 80;
      width: min(360px, calc(100vw - 28px));
      max-height: min(520px, calc(100vh - 120px));
      display: grid;
      grid-template-rows: auto 1fr auto;
      border-radius: 18px;
      border: 1px solid rgba(11,15,22,0.12);
      background: rgba(255,255,255,0.92);
      box-shadow: 0 18px 50px rgba(0,0,0,0.12);
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    .mili-panel[hidden]{ display:none !important; }

    .mili-head{
      display:flex;
      align-items:center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 12px;
      border-bottom: 1px solid rgba(11,15,22,0.08);
    }

    .mili-head strong{ font-weight: 950; letter-spacing: -0.01em; }
    .mili-head .mili-sub{ color: rgba(11,15,22,0.62); font-weight: 750; font-size: 0.92rem; }

    .mili-close{
      border: 1px solid rgba(11,15,22,0.12);
      background: rgba(255,255,255,0.86);
      color: rgba(11,15,22,0.92);
      border-radius: 999px;
      padding: 8px 10px;
      font: inherit;
      font-weight: 900;
      cursor: pointer;
    }

    .mili-body{
      padding: 12px;
      overflow: auto;
      display: grid;
      gap: 10px;
    }

    .mili-msg{
      max-width: 90%;
      border-radius: 14px;
      border: 1px solid rgba(11,15,22,0.10);
      padding: 10px 12px;
      font-weight: 700;
      line-height: 1.35;
      background: rgba(255,255,255,0.96);
      color: rgba(11,15,22,0.92);
      justify-self: start;
    }

    .mili-msg--user{
      background: rgba(11,15,22,0.92);
      color: #fff;
      border-color: rgba(11,15,22,0.92);
      justify-self: end;
    }

    .mili-actions{
      display:flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 2px;
    }

    .mili-actions a{
      text-decoration: none;
    }

    .mili-actions .btn{
      padding: 10px 12px;
      border-radius: 999px;
    }

    .mili-foot{
      padding: 10px;
      border-top: 1px solid rgba(11,15,22,0.08);
      display:flex;
      gap: 10px;
      align-items: center;
      background: rgba(255,255,255,0.94);
    }

    .mili-input{
      flex: 1 1 auto;
      border: 1px solid rgba(11,15,22,0.14);
      background: rgba(255,255,255,0.98);
      padding: 10px 12px;
      border-radius: 999px;
      outline: none;
      font: inherit;
      font-weight: 750;
      min-width: 0;
    }

    .mili-send{
      flex: 0 0 auto;
      border: 1px solid rgba(11,15,22,0.12);
      background: rgba(255,255,255,0.86);
      color: rgba(11,15,22,0.92);
      border-radius: 999px;
      padding: 10px 12px;
      font: inherit;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
    }

    @media (max-width: 420px){
      .mili-panel{ right: 10px; bottom: 68px; width: calc(100vw - 20px); }
      .mili-fab{ right: 10px; bottom: 10px; }
      .mili-fab button{ padding: 11px 12px; }
    }
  `;

  document.head.appendChild(style);
}

function createWidget() {
  injectStyles();

  const fabWrap = document.createElement('div');
  fabWrap.className = 'mili-fab';

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.setAttribute('aria-label', `Open chat with ${BOT_NAME}`);
  fab.textContent = `Chat with ${BOT_NAME}`;
  fabWrap.appendChild(fab);

  const panel = document.createElement('section');
  panel.className = 'mili-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `Chat with ${BOT_NAME}`);
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('hidden', '');

  const head = document.createElement('div');
  head.className = 'mili-head';

  const headLeft = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = BOT_NAME;
  const sub = document.createElement('div');
  sub.className = 'mili-sub';
  sub.textContent = 'Store help & availability';
  headLeft.appendChild(title);
  headLeft.appendChild(sub);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'mili-close';
  close.textContent = 'Close';

  head.appendChild(headLeft);
  head.appendChild(close);

  const body = document.createElement('div');
  body.className = 'mili-body';

  const foot = document.createElement('form');
  foot.className = 'mili-foot';
  foot.setAttribute('aria-label', 'Send a message');

  const input = document.createElement('input');
  input.className = 'mili-input';
  input.type = 'text';
  input.placeholder = 'Ask about a model (e.g., iPhone 13)…';
  input.autocomplete = 'off';

  const send = document.createElement('button');
  send.className = 'mili-send';
  send.type = 'submit';
  send.textContent = 'Send';

  foot.appendChild(input);
  foot.appendChild(send);

  panel.appendChild(head);
  panel.appendChild(body);
  panel.appendChild(foot);

  document.body.appendChild(panel);
  document.body.appendChild(fabWrap);

  function appendMessage(text, who) {
    const msg = document.createElement('div');
    msg.className = `mili-msg${who === 'user' ? ' mili-msg--user' : ''}`;
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }

  function appendWhatsAppAction(message) {
    const wrap = document.createElement('div');
    wrap.className = 'mili-actions';

    const link = document.createElement('a');
    link.className = 'btn btn-primary btn-small';
    link.href = buildWhatsAppHref(message);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open WhatsApp';

    wrap.appendChild(link);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function open() {
    panel.removeAttribute('hidden');
    input.focus();
  }

  function closePanel() {
    panel.setAttribute('hidden', '');
    fab.focus();
  }

  function answer(question) {
    const q = String(question || '').trim();
    if (!q) return;

    appendMessage(q, 'user');

    const n = normalize(q);

    const wantsAvailability = /(available|in stock|do you have|have you got|still have)/.test(n);
    const asksOrder = /(how.*order|how.*buy|order|purchase|pay)/.test(n);
    const asksAuthentic = /(original|genuine|authentic|counterfeit|aftermarket)/.test(n);
    const asksShip = /(ship|delivery|deliver|pickup|pick up)/.test(n);

    if (wantsAvailability || /iphone|macbook|ipad|airpods|watch/.test(n)) {
      const match = findInventoryMatch(q);

      if (match.status === 'found') {
        appendMessage(
          'Yes, this product is currently listed in our inventory. For confirmation and purchase, please contact us on WhatsApp.',
        );
        appendWhatsAppAction(`Hi Uncle Apple! Please confirm availability for: ${match.item.title}${match.item.subtitle ? ` (${match.item.subtitle})` : ''} in The Gambia.`);
        return;
      }

      if (match.status === 'unknown-page') {
        appendMessage(
          `For quick confirmation, pricing, and delivery in The Gambia, please contact us directly on WhatsApp.`,
        );
        appendWhatsAppAction('Hi Uncle Apple! I want to check availability in The Gambia.');
        return;
      }

      appendMessage(
        'This model is not currently listed in our inventory. You can contact us on WhatsApp and we will help you check availability.',
      );
      appendWhatsAppAction(`Hi Uncle Apple! Please help me check availability for: ${q} in The Gambia.`);
      return;
    }

    if (asksAuthentic) {
      appendMessage(
        'Yes, Uncle Apple Store only sells genuine Apple devices and original Apple parts. For orders and confirmation, please contact us through WhatsApp.',
      );
      appendWhatsAppAction('Hi Uncle Apple! Please confirm authenticity and availability for the model I want.');
      return;
    }

    if (asksOrder || asksShip) {
      appendMessage(
        'For quick confirmation, pricing, and delivery in The Gambia, please contact us directly on WhatsApp.',
      );
      appendWhatsAppAction('Hi Uncle Apple! I want to place an order. Please share availability and delivery/pickup options in The Gambia.');
      return;
    }

    appendMessage(
      'For quick confirmation, pricing, and delivery in The Gambia, please contact us directly on WhatsApp.',
    );
    appendWhatsAppAction('Hi Uncle Apple! I need help with a question about a product.');
  }

  fab.addEventListener('click', () => {
    if (panel.hasAttribute('hidden')) open();
    else closePanel();
  });

  close.addEventListener('click', closePanel);

  foot.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = '';
    answer(value);
  });

  // First message (minimal, no heavy init)
  appendMessage(`Hi! I’m ${BOT_NAME}. Ask me about availability or how to order.`);

  return { open, close: closePanel, answer };
}

function initMili() {
  // Avoid breaking non-browser contexts.
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Respect reduced motion users by not animating (we use none).
  // Defer to idle time to keep pages snappy.
  const start = () => {
    if (document.getElementById('mili-panel')) return;
    createWidget();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 1200 });
  } else {
    window.setTimeout(start, 250);
  }
}

// Initialize after DOM is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMili, { once: true });
} else {
  initMili();
}
