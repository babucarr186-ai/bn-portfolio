import { phones } from './phones.js';

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function normalizePhone(phone) {
  return {
    image: phone?.image || '',
    alt: phone?.alt || phone?.model || 'iPhone',
    model: phone?.model || 'iPhone',
    storage: phone?.storage || '—',
    condition: phone?.condition || '—',
  };
}

function buildInventoryMessage(phone) {
  const details = `${phone.model} (${phone.storage}, ${phone.condition})`;
  return `Hi! Please confirm availability for: ${details}.`;
}

function publicAssetUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  const cleanedBase = base.endsWith('/') ? base : base + '/';
  const cleanedPath = String(path || '').replace(/^\//, '');
  return cleanedBase + cleanedPath;
}

function renderSlides(trackEl, items) {
  trackEl.innerHTML = '';

  items.forEach((raw) => {
    const phone = normalizePhone(raw);

    const slide = el('article', 'inventory-slide');
    slide.setAttribute('aria-roledescription', 'slide');

    const grid = el('div', 'inventory-grid');

    const media = el('div', 'inventory-media');
    const frame = el('div', 'phone-frame inventory-frame');

    const notch = el('div', 'phone-notch');
    notch.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.src = publicAssetUrl(phone.image);
    img.alt = phone.alt;
    img.loading = 'lazy';
    img.decoding = 'async';

    frame.appendChild(notch);
    frame.appendChild(img);
    media.appendChild(frame);

    const meta = el('div', 'inventory-meta');

    const title = el('h3', 'inventory-title');
    title.textContent = phone.model;

    const specs = el('div', 'inventory-specs');

    const storage = el('div', 'inventory-spec');
    storage.innerHTML = `<strong>Storage:</strong> <span>${phone.storage}</span>`;

    const condition = el('div', 'inventory-spec');
    condition.innerHTML = `<strong>Condition:</strong> <span>${phone.condition}</span>`;

    specs.appendChild(storage);
    specs.appendChild(condition);

    const actions = el('div', 'inventory-actions');
    const wa = document.createElement('a');
    wa.className = 'btn btn-primary';
    wa.href = '#';
    wa.textContent = 'Request on WhatsApp';

    const msg = buildInventoryMessage(phone);
    if (typeof window.setWhatsAppHref === 'function') {
      window.setWhatsAppHref(wa, msg);
    }

    actions.appendChild(wa);

    meta.appendChild(title);
    meta.appendChild(specs);
    meta.appendChild(actions);

    grid.appendChild(media);
    grid.appendChild(meta);

    slide.appendChild(grid);
    trackEl.appendChild(slide);
  });
}

function initInventoryCarousel() {
  const track = document.getElementById('inventoryTrack');
  const prevBtn = document.getElementById('inventoryPrev');
  const nextBtn = document.getElementById('inventoryNext');

  if (!track || !prevBtn || !nextBtn) return;

  const items = Array.isArray(phones) ? phones : [];
  if (items.length === 0) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  renderSlides(track, items);

  let index = 0;
  let timerId = 0;

  function update() {
    const n = items.length;
    const x = index * 100;
    track.style.transform = `translate3d(${-x}%, 0, 0)`;

    const disableArrows = n <= 1;
    prevBtn.disabled = disableArrows;
    nextBtn.disabled = disableArrows;
  }

  function go(delta) {
    const n = items.length;
    if (n <= 1) return;

    index = (index + delta) % n;
    if (index < 0) index = n - 1;

    update();
    restart();
  }

  function restart() {
    if (timerId) window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      const n = items.length;
      if (n <= 1) return;
      index = (index + 1) % n;
      update();
    }, 4000);
  }

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  update();
  restart();
}

initInventoryCarousel();
