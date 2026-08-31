import {
  buildCatalogCardSummary,
  buildCatalogProductId,
  renderCatalog,
  renderRecommendationRail,
} from './renderCatalog.js';
const category = document.documentElement.dataset.category || 'iphones';

const catalogLoaders = {
  iphones: () => import('./data/iphones.js').then((module) => module.iphones),
  ipads: () => import('./data/ipads.js').then((module) => module.ipads),
  macbooks: () => import('./data/macbooks.js').then((module) => module.macbooks),
  watches: () => import('./data/watches.js').then((module) => module.watches),
  airpods: () => import('./data/airpods.js').then((module) => module.airpods),
  giftcards: () => import('./data/giftcards.js').then((module) => module.giftCards),
  accessories: () => import('./data/accessories.js').then((module) => module.accessories),
  appletvhome: () => import('./data/appleTvHome.js').then((module) => module.appleTvHome),
};

const pageMeta = {
  iphones: { label: 'iPhone', href: './index.html' },
  ipads: { label: 'iPad', href: './ipads.html' },
  macbooks: { label: 'MacBook', href: './macbook.html' },
  watches: { label: 'Watch', href: './apple-watch.html' },
  airpods: { label: 'AirPods', href: './airpods.html' },
  giftcards: { label: 'Gift Card', href: './gift-cards.html' },
  accessories: { label: 'Accessory', href: './accessories.html' },
  appletvhome: { label: 'Apple TV & Home', href: './apple-tv-home.html' },
};

let products = [];
const PAGE_SIZE = 12;
const grid = document.getElementById('catalogGrid');
const wrap = grid?.closest('.catalog-wrap');

function initTrendingSection() {
  const mountEl = document.getElementById('trendingGrid');
  if (!mountEl) return;

  const pool = Array.isArray(products) ? products : [];
  const picks = pool
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => !product?.sold)
    .slice(0, 6);
  if (!picks.length) {
    mountEl.textContent = '';
    return;
  }

  const rendered = renderCatalog({
    mountEl,
    products: picks.map(({ product }) => product),
    startIndex: 100000,
    detailIndices: picks.map(({ index }) => index),
    imageSizes: '(max-width: 640px) 78vw, 320px',
  });

  // Avoid duplicate #product-* ids on the homepage (inventory section uses those for hash navigation).
  void rendered;
  mountEl.querySelectorAll('.catalog-card[id]').forEach((card) => {
    card.removeAttribute('id');
  });
}

function buildSearchIndex(items) {
  return items.map((product, index) => ({
    id: buildCatalogProductId(product.title || 'Product', index),
    index,
    title: product.title || 'Product',
    subtitle: product.subtitle || '',
    product,
  }));
}

let searchIndex = [];

function createPaginationUi(parent) {
  if (!parent) return null;

  const controls = document.createElement('div');
  controls.className = 'catalog-pagination';

  const actions = document.createElement('div');
  actions.className = 'catalog-pagination-actions';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'catalog-pagination-btn';
  prev.textContent = 'Previous';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'catalog-pagination-btn';
  next.textContent = 'Next';

  actions.appendChild(prev);
  actions.appendChild(next);
  controls.appendChild(actions);
  parent.appendChild(controls);

  return { controls, actions, prev, next };
}

const paginationUi = createPaginationUi(wrap);

const state = {
  currentPage: 1,
  pageSize: PAGE_SIZE,
  pendingTargetId: '',
  rendered: [],
};

function getTotalPages() {
  return Math.max(1, Math.ceil(products.length / state.pageSize));
}

function highlightCard(card) {
  if (!card) return;
  card.classList.add('is-highlight');
  window.setTimeout(() => card.classList.remove('is-highlight'), 1400);
}

function focusRenderedTarget(targetId) {
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  highlightCard(el);
}

function renderPage() {
  if (!grid) return;

  const totalPages = getTotalPages();
  state.currentPage = Math.min(Math.max(state.currentPage, 1), totalPages);

  const start = (state.currentPage - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, products.length);

  state.rendered = renderCatalog({
    mountEl: grid,
    products: products.slice(start, end),
    startIndex: start,
  });

  if (paginationUi) {
    paginationUi.controls.hidden = totalPages <= 1;
    paginationUi.prev.disabled = state.currentPage <= 1;
    paginationUi.next.disabled = state.currentPage >= totalPages;
  }

  if (state.pendingTargetId) {
    const targetId = state.pendingTargetId;
    state.pendingTargetId = '';
    window.requestAnimationFrame(() => focusRenderedTarget(targetId));
  }
}

function showProductById(targetId) {
  const target = searchIndex.find((item) => item.id === targetId);
  if (!target) return;

  const nextPage = Math.floor(target.index / state.pageSize) + 1;
  if (nextPage !== state.currentPage) {
    state.pendingTargetId = target.id;
    state.currentPage = nextPage;
    renderPage();
    return;
  }

  focusRenderedTarget(target.id);
}

function initRecommendations(items, catalogs) {
  if (!wrap || !Array.isArray(items) || !items.length) return;

  const categoryOrder = ['iphones', 'ipads', 'macbooks', 'watches', 'airpods', 'giftcards', 'accessories', 'appletvhome'];
  const pools = categoryOrder
    .filter((key) => key !== category)
    .filter((key) => Array.isArray(catalogs[key]))
    .map((key) => {
      const meta = pageMeta[key];
      const productItems = catalogs[key]
        .filter((product) => !product?.sold)
        .map((product, index) => {
          const title = product.title || 'Product';
          const fallbackId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'}-${index + 1}`;
          const targetId = `product-${fallbackId}`;
          const summary = buildCatalogCardSummary(product);

          return {
            title,
            product,
            summary: summary.summary,
            note: summary.note,
            priceLabel: summary.priceLabel,
            categoryLabel: meta?.label || key,
            href: `${meta?.href || './'}#${targetId}`,
            onClick: null,
          };
        });

      return {
        key,
        items: productItems,
      };
    });

  const mixed = [];
  let added = true;
  while (added && mixed.length < 14) {
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

    showProductById(target.id);
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

function initCatalogPagination() {
  if (!paginationUi) return;

  paginationUi.prev.addEventListener('click', () => {
    if (state.currentPage <= 1) return;
    state.currentPage -= 1;
    renderPage();
    wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  paginationUi.next.addEventListener('click', () => {
    if (state.currentPage >= getTotalPages()) return;
    state.currentPage += 1;
    renderPage();
    wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function initCatalogHashNavigation() {
  function syncHash() {
    const targetId = String(window.location.hash || '').replace(/^#/, '').trim();
    if (!targetId) return;
    showProductById(targetId);
  }

  window.addEventListener('hashchange', syncHash);
  syncHash();
}

async function loadRecommendations() {
  const entries = await Promise.all(
    Object.entries(catalogLoaders).map(async ([key, load]) => [key, await load()]),
  );
  initRecommendations(searchIndex, Object.fromEntries(entries));
}

async function initCatalogPage() {
  const loadProducts = catalogLoaders[category] || catalogLoaders.iphones;
  products = await loadProducts();
  searchIndex = buildSearchIndex(products);

  renderPage();
  initTrendingSection();
  initCatalogPagination();
  initCatalogSearch(searchIndex);
  initCatalogHashNavigation();
  initBackToTop();

  const scheduleRecommendations = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => void loadRecommendations(), { timeout: 2500 });
    } else {
      window.setTimeout(() => void loadRecommendations(), 1200);
    }
  };

  if (document.readyState === 'complete') scheduleRecommendations();
  else window.addEventListener('load', scheduleRecommendations, { once: true });
}

void initCatalogPage();
