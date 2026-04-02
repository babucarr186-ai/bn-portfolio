import { buildCatalogCardSummary, renderCatalog, renderRecommendationRail } from './renderCatalog.js';
import { iphones } from './data/iphones.js';
import { macbooks } from './data/macbooks.js';
import { watches } from './data/watches.js';
import { airpods } from './data/airpods.js';
import { giftCards } from './data/giftcards.js';
import { accessories } from './data/accessories.js';
import { ipads } from './data/ipads.js';
import { appleTvHome } from './data/appleTvHome.js';

const category = document.documentElement.dataset.category || 'iphones';

const map = {
  iphones,
  ipads,
  macbooks,
  watches,
  airpods,
  giftcards: giftCards,
  accessories,
  appletvhome: appleTvHome,
};

const pageMeta = {
  iphones: { label: 'iPhone', href: './index.html' },
  ipads: { label: 'iPad', href: './ipads.html' },
  macbooks: { label: 'MacBook', href: './macbook.html' },
  watches: { label: 'Watch', href: './apple-watch.html' },
  airpods: { label: 'AirPods', href: './airpods.html' },
  giftcards: { label: 'Gift Card', href: './gift-cards.html' },
  accessories: { label: 'Accessory', href: './accessories.html' },
};

const products = map[category] || iphones;

const rendered = renderCatalog({
  mountEl: document.getElementById('catalogGrid'),
  products,
});

function initRecommendations(items) {
  const grid = document.getElementById('catalogGrid');
  const wrap = grid?.closest('.catalog-wrap');
  if (!wrap || !Array.isArray(items) || !items.length) return;

  const categoryOrder = ['iphones', 'ipads', 'macbooks', 'watches', 'airpods', 'giftcards', 'accessories'];
  const pools = categoryOrder
    .filter((key) => Array.isArray(map[key]))
    .map((key) => {
      const meta = pageMeta[key];
      const productItems = map[key]
        .filter((product) => !product?.sold)
        .map((product, index) => {
          const title = product.title || 'Product';
          const samePage = key === category;
          const samePageMatch = samePage
            ? items.find((item) => item?.product === product)
            : null;
          const fallbackId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'}-${index + 1}`;
          const targetId = samePageMatch?.id || `product-${fallbackId}`;
          const summary = buildCatalogCardSummary(product);

          return {
            title,
            product,
            summary: summary.summary,
            note: summary.note,
            priceLabel: summary.priceLabel,
            categoryLabel: meta?.label || key,
            href: samePage ? `#${targetId}` : `${meta?.href || './'}#${targetId}`,
            onClick: samePage
              ? (event) => {
                  event.preventDefault();
                  const target = document.getElementById(targetId);
                  if (!target) return;
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  target.classList.add('is-highlight');
                  window.setTimeout(() => target.classList.remove('is-highlight'), 1400);
                }
              : null,
          };
        });

      return {
        key,
        items: productItems,
      };
    });

  const mixed = [];
  let added = true;
  while (added && mixed.length < 12) {
    added = false;
    pools.forEach((pool) => {
      const nextItem = pool.items.shift();
      if (!nextItem) return;
      mixed.push(nextItem);
      added = true;
    });
  }

  if (!mixed.length) return;

  const mount = document.createElement('div');
  renderRecommendationRail({ mountEl: mount, items: mixed });
  if (!mount.childElementCount) return;

  wrap.insertAdjacentElement('afterend', mount);
}

function initBackToTop() {
  if (document.querySelector('.back-to-top')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.setAttribute('aria-label', 'Back to top');
  button.textContent = 'Back to Top';

  function syncVisibility() {
    button.classList.toggle('is-visible', window.scrollY > 520);
  }

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', syncVisibility, { passive: true });
  syncVisibility();
  document.body.appendChild(button);
}

function initCatalogSearch(items) {
  const input = document.getElementById('navSearch');
  const list = document.getElementById('productSuggestions');
  if (!input || !list) return;

  const normalized = Array.isArray(items) ? items : [];

  function setSuggestions(query) {
    const q = String(query || '').trim().toLowerCase();
    const matches = q
      ? normalized.filter((item) => `${item.title} ${item.subtitle || ''}`.toLowerCase().includes(q))
      : normalized;

    list.textContent = '';
    matches.slice(0, 12).forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.title;
      list.appendChild(opt);
    });
  }

  function goToSelection(value) {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return;

    const exact = normalized.find((item) => String(item.title || '').trim().toLowerCase() === v);
    const fallback = normalized.find((item) => String(item.title || '').trim().toLowerCase().includes(v));
    const target = exact || fallback;
    if (!target) return;

    const el = document.getElementById(target.id);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('is-highlight');
    window.setTimeout(() => el.classList.remove('is-highlight'), 1400);
  }

  setSuggestions('');

  input.addEventListener('input', () => setSuggestions(input.value));

  input.addEventListener('change', () => {
    goToSelection(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    goToSelection(input.value);
  });
}

initCatalogSearch(rendered);
initRecommendations(rendered);
initBackToTop();
