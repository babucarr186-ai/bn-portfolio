import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCatalogProductId } from '../src/catalog/renderCatalog.js';

import { iphones } from '../src/catalog/data/iphones.js';
import { ipads } from '../src/catalog/data/ipads.js';
import { macbooks } from '../src/catalog/data/macbooks.js';
import { watches } from '../src/catalog/data/watches.js';
import { airpods } from '../src/catalog/data/airpods.js';
import { giftCards } from '../src/catalog/data/giftcards.js';
import { accessories } from '../src/catalog/data/accessories.js';
import { appleTvHome } from '../src/catalog/data/appleTvHome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CATALOG_MANIFEST_PATH = path.join(projectRoot, 'public', 'push-catalog.json');

const PAGE_META = {
  iphones: { href: '/index.html' },
  ipads: { href: '/ipads.html' },
  macbooks: { href: '/macbook.html' },
  watches: { href: '/apple-watch.html' },
  airpods: { href: '/airpods.html' },
  giftcards: { href: '/gift-cards.html' },
  accessories: { href: '/accessories.html' },
  appletvhome: { href: '/apple-tv-home.html' },
};

const CATEGORIES = [
  { key: 'iphones', items: iphones },
  { key: 'ipads', items: ipads },
  { key: 'macbooks', items: macbooks },
  { key: 'watches', items: watches },
  { key: 'airpods', items: airpods },
  { key: 'giftcards', items: giftCards },
  { key: 'accessories', items: accessories },
  { key: 'appletvhome', items: appleTvHome },
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function stripQuery(value) {
  const raw = String(value || '');
  const idx = raw.indexOf('?');
  return idx === -1 ? raw : raw.slice(0, idx);
}

function imageFolderHint(images) {
  const first = Array.isArray(images) && images.length ? stripQuery(images[0]) : '';
  if (!first) return '';

  // Most product entries use folders like:
  // products/iphones/iphone-17-lavender-256gb/iphone-17-...jpg
  // We want the folder segment right before the filename.
  const parts = first.split('/').filter(Boolean);
  if (parts.length < 3) return '';

  const maybeFolder = parts[parts.length - 2];
  // Avoid overly-generic folders.
  if (!maybeFolder || maybeFolder.length < 4) return '';
  if (maybeFolder === 'iphones' || maybeFolder === 'ipads' || maybeFolder === 'macbooks' || maybeFolder === 'watches') {
    return '';
  }

  return slugify(maybeFolder);
}

function sanitizeVariantText(value) {
  const raw = String(value || '');
  if (!raw) return '';

  return raw
    .replace(/GMD\s*\d[\d,]*/gi, '')
    .replace(/\b\d[\d,]*\s*GMD\b/gi, '')
    .replace(/Battery\s*\d+%/gi, '')
    .replace(/\bbattery\s*-?\s*\d+%\b/gi, '')
    .replace(/\bprice\s+on\s+request\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeProductKey({ categoryKey, product }) {
  const folder = imageFolderHint(product?.images);

  if (folder) {
    // Prefer a media-folder derived identity so title edits don't create a "new" product.
    // This matches how products are typically added: new folder for a new listing.
    return `${categoryKey}:${folder}`;
  }

  const titleSlug = slugify(product?.title || 'product');

  // Fallback: sanitize variant text so price/battery tweaks don’t create “new” keys.
  const variantSource = sanitizeVariantText(product?.productTitle || product?.subtitle || '');
  const variantSlug = slugify(variantSource) || 'item';
  return `${categoryKey}:${titleSlug}:${variantSlug}`;
}

function getStockRemaining(product) {
  const remaining = Number(product?.stockRemaining);
  return Number.isFinite(remaining) ? remaining : 1;
}

async function generate() {
  const out = {
    version: 2,
    generatedAt: new Date().toISOString(),
    products: [],
  };

  for (const cat of CATEGORIES) {
    const categoryKey = cat.key;
    const items = Array.isArray(cat.items) ? cat.items : [];
    const pageHref = PAGE_META[categoryKey]?.href || '/index.html';

    items.forEach((product, index) => {
      const title = String(product?.title || 'Product');
      const sold = Boolean(product?.sold);
      const stockRemaining = getStockRemaining(product);
      const available = !sold && stockRemaining > 0;

      const productId = buildCatalogProductId(title, index);
      const url = `${pageHref}#${productId}`;

      out.products.push({
        key: computeProductKey({ categoryKey, product }),
        title,
        categoryKey,
        url,
        available,
        sold,
        stockRemaining,
      });
    });
  }

  await writeFile(CATALOG_MANIFEST_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Generated push catalog manifest: ${path.relative(projectRoot, CATALOG_MANIFEST_PATH)}`);
}

generate();
