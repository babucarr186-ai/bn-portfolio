import {
  buildCatalogCardSummary,
  buildCatalogProductId,
  renderCatalog,
  renderRecommendationRail,
} from './renderCatalog.js';
import { iphones } from './data/iphones.js';
import { macbooks } from './data/macbooks.js';
import { watches } from './data/watches.js';
import { airpods } from './data/airpods.js';
import { giftCards } from './data/giftcards.js';
import { accessories } from './data/accessories.js';
import { ipads } from './data/ipads.js';
import { appleTvHome } from './data/appleTvHome.js';
import { debounce } from '../utils.js';

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
  appletvhome: { label: 'Apple TV & Home', href: './apple-tv-home.html' },
};

const products = map[category] || iphones;
const PAGE_SIZE = 12;
const grid = document.getElementById('catalogGrid');
const wrap = grid?.closest('.catalog-wrap');

function buildSearchIndex(items) {
  return items.map((product, index) => ({
    id: buildCatalogProductId(product.title || 'Product', index),
    index,
    title: product.title || 'Product',
    subtitle: product.subtitle || '',
    product,
  }));
}

const searchIndex = buildSearchIndex(products);

function createPaginationUi(parent) {
  if (!parent) return null;

  const controls = document.createElement('div');
  controls.className = 'catalog-pagination';

  const summary = document.createElement('p');
  summary.className = 'catalog-pagination-summary';

  const actions = document.createElement('div');
  actions.className = 'catalog-pagination-actions';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'catalog-pagination-btn';
  prev.textContent = 'Previous';

  const pages = document.createElement('div');
  pages.className = 'catalog-pagination-pages';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'catalog-pagination-btn';
  next.textContent = 'Next';

  actions.appendChild(prev);
  actions.appendChild(pages);
  actions.appendChild(next);
  controls.appendChild(summary);
  controls.appendChild(actions);
  parent.appendChild(controls);

  return { controls, summary, actions, prev, pages, next };
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
    paginationUi.summary.textContent = `Showing ${start + 1}-${end} of ${products.length} products`;
    paginationUi.prev.disabled = state.currentPage <= 1;
    paginationUi.next.disabled = state.currentPage >= totalPages;
    paginationUi.pages.textContent = '';

    const pageNumbers = [];
    for (let page = 1; page <= totalPages; page += 1) {
      if (page === 1 || page === totalPages || Math.abs(page - state.currentPage) <= 1) {
        pageNumbers.push(page);
      }
    }

    pageNumbers.forEach((page, index) => {
      if (index > 0 && pageNumbers[index - 1] !== page - 1) {
        const gap = document.createElement('span');
        gap.className = 'catalog-pagination-gap';
        gap.textContent = '...';
        paginationUi.pages.appendChild(gap);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-pagination-page';
      button.textContent = String(page);
      button.setAttribute('aria-current', page === state.currentPage ? 'page' : 'false');
      button.addEventListener('click', () => {
        if (page === state.currentPage) return;
        state.currentPage = page;
        renderPage();
        wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      paginationUi.pages.appendChild(button);
    });
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

renderPage();

function initRecommendations(items) {
  if (!wrap || !Array.isArray(items) || !items.length) return;

  const categoryOrder = ['iphones', 'ipads', 'macbooks', 'watches', 'airpods', 'giftcards', 'accessories', 'appletvhome'];
  const pools = categoryOrder
    .filter((key) => key !== category)
    .filter((key) => Array.isArray(map[key]))
    .map((key) => {
      const meta = pageMeta[key];
      const productItems = map[key]
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

  input.addEventListener('input', debounce(() => setSuggestions(input.value), 200));

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

initCatalogPagination();
initCatalogSearch(searchIndex);
initRecommendations(searchIndex);
initCatalogHashNavigation();
initBackToTop();
