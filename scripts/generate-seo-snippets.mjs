import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCatalogCardSummary } from '../src/catalog/renderCatalog.js';
import { accessories } from '../src/catalog/data/accessories.js';
import { airpods } from '../src/catalog/data/airpods.js';
import { appleTvHome } from '../src/catalog/data/appleTvHome.js';
import { giftCards } from '../src/catalog/data/giftcards.js';
import { iphones } from '../src/catalog/data/iphones.js';
import { ipads } from '../src/catalog/data/ipads.js';
import { macbooks } from '../src/catalog/data/macbooks.js';
import { watches } from '../src/catalog/data/watches.js';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = dirname(dirname(scriptPath));
const siteOrigin = 'https://uncleapplestore.com';
const storeId = 'https://uncleapplestore.com/#store';
const productPathBase = '/p';

const pageConfigs = [
  {
    key: 'iphones',
    file: 'index.html',
    absoluteUrl: 'https://uncleapplestore.com/',
    sectionLabel: 'iPhone',
    pageLabel: 'iPhones',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current iPhone listings from Uncle Apple Store for buyers in The Gambia who want real photos, honest condition notes, battery health details, and fast WhatsApp confirmation before payment.',
    products: iphones,
  },
  {
    key: 'ipads',
    file: 'ipads.html',
    absoluteUrl: 'https://uncleapplestore.com/ipads.html',
    sectionLabel: 'iPad',
    pageLabel: 'iPads',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current iPad listings from Uncle Apple Store for buyers in The Gambia who want clear storage, condition, and delivery information before they place an order.',
    products: ipads,
  },
  {
    key: 'macbooks',
    file: 'macbook.html',
    absoluteUrl: 'https://uncleapplestore.com/macbook.html',
    sectionLabel: 'MacBook',
    pageLabel: 'MacBooks',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current MacBook listings from Uncle Apple Store for buyers in The Gambia who want honest condition notes, storage details, and fast WhatsApp confirmation before payment.',
    products: macbooks,
  },
  {
    key: 'watches',
    file: 'apple-watch.html',
    absoluteUrl: 'https://uncleapplestore.com/apple-watch.html',
    sectionLabel: 'Apple Watch',
    pageLabel: 'Apple Watch listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current Apple Watch listings from Uncle Apple Store for buyers in The Gambia who want clear condition details and fast WhatsApp confirmation before payment.',
    products: watches,
  },
  {
    key: 'airpods',
    file: 'airpods.html',
    absoluteUrl: 'https://uncleapplestore.com/airpods.html',
    sectionLabel: 'AirPods',
    pageLabel: 'AirPods listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current AirPods listings from Uncle Apple Store for buyers in The Gambia who want real photos, clean condition details, and quick WhatsApp confirmation before payment.',
    products: airpods,
  },
  {
    key: 'giftcards',
    file: 'gift-cards.html',
    absoluteUrl: 'https://uncleapplestore.com/gift-cards.html',
    sectionLabel: 'Apple Gift Card',
    pageLabel: 'Apple Gift Card listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current Apple Gift Card listings from Uncle Apple Store for buyers in The Gambia who want fast WhatsApp confirmation and honest availability before payment.',
    products: giftCards,
  },
  {
    key: 'accessories',
    file: 'accessories.html',
    absoluteUrl: 'https://uncleapplestore.com/accessories.html',
    sectionLabel: 'Apple accessory',
    pageLabel: 'Apple accessory listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current Apple accessory listings from Uncle Apple Store for buyers in The Gambia who want real photos, clear compatibility notes, and quick WhatsApp confirmation before payment.',
    products: accessories,
  },
  {
    key: 'appletvhome',
    file: 'apple-tv-home.html',
    absoluteUrl: 'https://uncleapplestore.com/apple-tv-home.html',
    sectionLabel: 'Apple TV and Home',
    pageLabel: 'Apple TV and Home listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current Apple TV and smart home listings from Uncle Apple Store for buyers in The Gambia who want real photos and quick WhatsApp confirmation before payment.',
    products: appleTvHome,
  },
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(value) {
  return String(value || '')
    .split(/(?<=[.!?])\s+/)
    .map((part) => normalizeSpace(part))
    .filter(Boolean);
}

function canonicalizeDescriptionPart(value) {
  return normalizeSpace(value)
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .replace(/\bgood\s+good\b/g, 'good')
    .replace(/\bexcellent\s+very clean\b/g, 'very clean')
    .replace(/\bclean\s+clean\b/g, 'clean')
    .replace(/\bready to use\s+ready to use\b/g, 'ready to use');
}

export function cleanDescriptionText(value) {
  return normalizeSpace(value)
    .replace(/\bGood\s+Good\b/g, 'Good')
    .replace(/\bExcellent\s+Very clean\b/g, 'Very clean')
    .replace(/\bClean\s+Clean\b/g, 'Clean')
    .replace(/\bReady to use\.\s+Ready to use\./g, 'Ready to use.');
}

export function buildSchemaDescription(product, summary) {
  const parts = [];
  const seen = new Set();

  splitSentences(cleanDescriptionText(product?.description)).forEach((part) => {
    const key = canonicalizeDescriptionPart(part);
    if (!key || seen.has(key)) return;
    seen.add(key);
    parts.push(part);
  });

  if (!parts.length) {
    [summary?.summary, summary?.note].forEach((part) => {
      const cleanedPart = cleanDescriptionText(part);
      const key = canonicalizeDescriptionPart(cleanedPart);
      if (!key || seen.has(key)) return;
      seen.add(key);
      parts.push(cleanedPart);
    });
  }

  return normalizeSpace(parts.join(' '));
}

function schemaConditionUrl(product) {
  const condition = normalizeSpace(product?.condition || product?.subtitle || '').toLowerCase();
  if (condition.includes('brand new') || condition.includes('sealed')) return 'https://schema.org/NewCondition';
  return 'https://schema.org/UsedCondition';
}

function schemaAvailabilityUrl(product) {
  return product?.sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';
}

function toAbsoluteUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${siteOrigin}/${raw.replace(/^\/+/, '')}`;
}

function buildProductSlug(product, index) {
  const base = slugify(product?.productTitle || product?.title || 'product') || 'product';
  return `${base}-${Number(index) + 1}`;
}

function buildProductUrl(config, product, index) {
  const slug = buildProductSlug(product, index);
  return `${siteOrigin}${productPathBase}/${config.key}/${slug}/`;
}

function pickProductImages(product) {
  const sources = [];
  if (Array.isArray(product?.images)) sources.push(...product.images);
  if (product?.image) sources.push(product.image);

  const abs = sources
    .map((img) => String(img || '').trim())
    .filter(Boolean)
    .map((img) => img.replace(/\?.*$/, ''))
    .map(toAbsoluteUrl);

  const unique = [];
  const seen = new Set();
  abs.forEach((img) => {
    if (!img || seen.has(img)) return;
    seen.add(img);
    unique.push(img);
  });

  return unique.slice(0, 8);
}

function normalizeSchemaPrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (value === null || value === undefined) return null;

  const asNumber = Number(value);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
}

function buildProductSchema(config, product, index) {
  const summary = buildCatalogCardSummary(product);
  const description = buildSchemaDescription(product, summary);
  const url = buildProductUrl(config, product, index);
  const price = normalizeSchemaPrice(product?.price);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.productTitle || product.title || `${config.sectionLabel} listing`,
    image: pickProductImages(product),
    description,
    brand: { '@type': 'Brand', name: 'Apple' },
    url,
    availability: schemaAvailabilityUrl(product),
    itemCondition: schemaConditionUrl(product),
  };

  if (price !== null) {
    schema.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'GMD',
      price,
      availability: schemaAvailabilityUrl(product),
      itemCondition: schemaConditionUrl(product),
      seller: { '@id': storeId },
    };
  }

  return schema;
}

function buildItemListSchema(config, products) {
  const items = products.map((schema, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: schema.url,
    item: { '@id': schema['@id'] },
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${config.absoluteUrl}#current-inventory`,
    name: `Current ${config.pageLabel} in The Gambia`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items,
  };
}

function buildSchemaMarkup(config) {
  const rawProducts = Array.isArray(config.products) ? config.products : [];
  const products = rawProducts
    .map((product, index) => buildProductSchema(config, product, index))
    .filter(Boolean);

  const schemas = [buildItemListSchema(config, products), ...products];

  return `<!-- SEO-SCHEMA:START ${config.file} -->\n  <script type="application/ld+json">\n${JSON.stringify(schemas, null, 2)}\n  </script>\n<!-- SEO-SCHEMA:END ${config.file} -->`;
}

function stripGeneratedBlocks(content, file) {
  return content
    .replace(new RegExp(`\\n?<!-- SEO-GENERATED:START ${file.replace('.', '\\.') } -->[\\s\\S]*?<!-- SEO-GENERATED:END ${file.replace('.', '\\.') } -->`, 'g'), '')
    .replace(new RegExp(`\\n?<!-- SEO-SCHEMA:START ${file.replace('.', '\\.') } -->[\\s\\S]*?<!-- SEO-SCHEMA:END ${file.replace('.', '\\.') } -->`, 'g'), '');
}

async function updatePage(config) {
  const filePath = resolve(projectRoot, config.file);
  const raw = await readFile(filePath, 'utf8');
  const cleaned = stripGeneratedBlocks(raw, config.file);

  const schemaMarkup = buildSchemaMarkup(config);

  const withSchema = cleaned.replace('</head>', `${schemaMarkup}\n</head>`);
  await writeFile(filePath, withSchema, 'utf8');
}

function escapeAttribute(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildProductPageHtml({ config, product, index }) {
  const schema = buildProductSchema(config, product, index);

  const title = schema.name;
  const description = schema.description;
  const canonical = schema.url;
  const primaryImage = Array.isArray(schema.image) && schema.image.length ? schema.image[0] : `${siteOrigin}/apple-profile-header.jpg`;

  const backLink = config.absoluteUrl;
  const price = normalizeSchemaPrice(product?.price);
  const priceText = price === null
    ? 'Price on request'
    : `GMD ${new Intl.NumberFormat('en-US').format(price)}`;
  const availabilityText = product?.sold ? 'Sold out' : 'Available';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(title)} | Uncle Apple Store</title>
  <meta name="description" content="${escapeAttribute(description)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${escapeAttribute(canonical)}" />

  <meta property="og:site_name" content="Uncle Apple Store" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeAttribute(title)}" />
  <meta property="og:description" content="${escapeAttribute(description)}" />
  <meta property="og:url" content="${escapeAttribute(canonical)}" />
  <meta property="og:image" content="${escapeAttribute(primaryImage)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttribute(title)}" />
  <meta name="twitter:description" content="${escapeAttribute(description)}" />
  <meta name="twitter:image" content="${escapeAttribute(primaryImage)}" />

  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/site.css?v=20260304" />

  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>

<body>
  <header class="nav" aria-label="Primary navigation">
    <div class="container">
      <div class="nav-inner">
        <a class="logo" href="${escapeAttribute(backLink)}" aria-label="Home">
          <span class="logo-badge" aria-hidden="true">
            <img class="logo-img" src="/logo.jpeg" alt="Uncle Apple" loading="eager" decoding="async" />
          </span>
        </a>
        <nav class="nav-links" aria-label="Site links">
          <a href="/">iPhones</a>
          <a href="/ipads.html">iPads</a>
          <a href="/macbook.html">MacBook</a>
          <a href="/apple-watch.html">Apple Watch</a>
          <a href="/airpods.html">AirPods</a>
          <a href="/gift-cards.html">Gift Cards</a>
          <a href="/accessories.html">Accessories</a>
          <a href="/apple-tv-home.html">Apple TV &amp; Home</a>
        </nav>
        <div class="nav-actions"></div>
      </div>
    </div>
  </header>

  <main id="top">
    <section class="section" aria-label="Product details">
      <div class="container">
        <h1>${escapeHtml(title)}</h1>
        <p class="subtle">${escapeHtml(description)}</p>

        <div class="notice" style="margin-top:14px">
          <div><strong>Price:</strong> <span class="product-price">${escapeHtml(priceText)}</span></div>
          <div><strong>Status:</strong> ${escapeHtml(availabilityText)}</div>
        </div>

        <div style="margin-top:14px">
          <a class="btn btn-primary" href="${escapeAttribute(backLink)}">Back to listings</a>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function generateProductPages() {
  const outRoot = resolve(projectRoot, 'public', productPathBase.replace(/^\/+/, ''));
  await rm(outRoot, { recursive: true, force: true });

  for (const config of pageConfigs) {
    const items = Array.isArray(config.products) ? config.products : [];
    for (let index = 0; index < items.length; index += 1) {
      const product = items[index];
      const slug = buildProductSlug(product, index);
      const outDir = resolve(outRoot, config.key, slug);
      const outFile = resolve(outDir, 'index.html');
      const html = buildProductPageHtml({ config, product, index });
      if (!html) continue;

      await mkdir(outDir, { recursive: true });
      await writeFile(outFile, html, 'utf8');
    }
  }
}

function stripGeneratedSitemapBlock(content) {
  return content.replace(
    /\n?<!-- SEO-PRODUCT-URLS:START -->[\s\S]*?<!-- SEO-PRODUCT-URLS:END -->\n?/g,
    '',
  );
}

function buildSitemapProductBlock(productUrls) {
  const urls = productUrls
    .filter(Boolean)
    .map((loc) => `  <url>\n    <loc>${escapeHtml(loc)}</loc>\n    <priority>0.3</priority>\n  </url>`)
    .join('\n');

  return `<!-- SEO-PRODUCT-URLS:START -->\n${urls}\n<!-- SEO-PRODUCT-URLS:END -->`;
}

async function updateSitemap() {
  const sitemapPath = resolve(projectRoot, 'public', 'sitemap.xml');
  const raw = await readFile(sitemapPath, 'utf8');
  const cleaned = stripGeneratedSitemapBlock(raw);

  const productUrls = [];
  pageConfigs.forEach((config) => {
    const items = Array.isArray(config.products) ? config.products : [];
    items.forEach((product, index) => {
      const schema = buildProductSchema(config, product, index);
      if (!schema) return;
      productUrls.push(schema.url);
    });
  });

  const block = buildSitemapProductBlock(productUrls);
  const next = cleaned.replace(/\s*<\/urlset>\s*$/i, `\n${block}\n</urlset>\n`);
  await writeFile(sitemapPath, next, 'utf8');
}

export async function generateSeoSnippets() {
  for (const config of pageConfigs) {
    await updatePage(config);
  }

  await generateProductPages();
  await updateSitemap();
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await generateSeoSnippets();
}
