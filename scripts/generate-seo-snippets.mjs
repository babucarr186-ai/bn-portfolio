import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const storeId = 'https://uncleapplestore.com/#store';

const pageConfigs = [
  {
    file: 'index.html',
    absoluteUrl: 'https://uncleapplestore.com/',
    sectionLabel: 'iPhone',
    pageLabel: 'iPhones',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current iPhone listings from Uncle Apple Store for buyers in The Gambia who want real photos, honest condition notes, battery health details, and fast WhatsApp confirmation before payment.',
    products: iphones,
  },
  {
    file: 'ipads.html',
    absoluteUrl: 'https://uncleapplestore.com/ipads.html',
    sectionLabel: 'iPad',
    pageLabel: 'iPads',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current iPad listings from Uncle Apple Store for buyers in The Gambia who want clear storage, condition, and delivery information before they place an order.',
    products: ipads,
  },
  {
    file: 'macbook.html',
    absoluteUrl: 'https://uncleapplestore.com/macbook.html',
    sectionLabel: 'MacBook',
    pageLabel: 'MacBooks',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current MacBook listings from Uncle Apple Store for buyers in The Gambia who want honest condition notes, storage details, and fast WhatsApp confirmation before payment.',
    products: macbooks,
  },
  {
    file: 'apple-watch.html',
    absoluteUrl: 'https://uncleapplestore.com/apple-watch.html',
    sectionLabel: 'Apple Watch',
    pageLabel: 'Apple Watch listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current Apple Watch listings from Uncle Apple Store for buyers in The Gambia who want clear condition details and fast WhatsApp confirmation before payment.',
    products: watches,
  },
  {
    file: 'airpods.html',
    absoluteUrl: 'https://uncleapplestore.com/airpods.html',
    sectionLabel: 'AirPods',
    pageLabel: 'AirPods listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current AirPods listings from Uncle Apple Store for buyers in The Gambia who want real photos, clean condition details, and quick WhatsApp confirmation before payment.',
    products: airpods,
  },
  {
    file: 'gift-cards.html',
    absoluteUrl: 'https://uncleapplestore.com/gift-cards.html',
    sectionLabel: 'Apple Gift Card',
    pageLabel: 'Apple Gift Card listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current Apple Gift Card listings from Uncle Apple Store for buyers in The Gambia who want fast WhatsApp confirmation and honest availability before payment.',
    products: giftCards,
  },
  {
    file: 'accessories.html',
    absoluteUrl: 'https://uncleapplestore.com/accessories.html',
    sectionLabel: 'Apple accessory',
    pageLabel: 'Apple accessory listings',
    locationCopy: 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.',
    introCopy: 'These are current Apple accessory listings from Uncle Apple Store for buyers in The Gambia who want real photos, clear compatibility notes, and quick WhatsApp confirmation before payment.',
    products: accessories,
  },
  {
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

function schemaConditionUrl(product) {
  const condition = normalizeSpace(product?.condition || product?.subtitle || '').toLowerCase();
  if (condition.includes('brand new') || condition.includes('sealed')) return 'https://schema.org/NewCondition';
  return 'https://schema.org/UsedCondition';
}

function getVisibleProducts(products) {
  return (Array.isArray(products) ? products : []).filter((product) => !product?.sold).slice(0, 12);
}

function buildHref(index, product, file) {
  const id = `product-${slugify(product?.title || `product-${index + 1}`)}-${index + 1}`;
  return file === 'index.html' ? `#${id}` : `#${id}`;
}

function buildAbsoluteHref(index, product, absoluteUrl) {
  const id = `product-${slugify(product?.title || `product-${index + 1}`)}-${index + 1}`;
  return `${absoluteUrl}#${id}`;
}

function buildLine(product) {
  const summary = buildCatalogCardSummary(product);
  const lineParts = [summary.summary, summary.priceLabel].filter(Boolean);
  return lineParts.join(' — ');
}

function buildSectionMarkup(config) {
  const items = getVisibleProducts(config.products);
  const listMarkup = items
    .map((product, index) => {
      const href = buildHref(index, product, config.file);
      const line = buildLine(product);
      return `          <li><a href="${href}">${escapeHtml(product.title || 'Product')}</a>${line ? ` — ${escapeHtml(line)}` : ''}</li>`;
    })
    .join('\n');

  return `<!-- SEO-GENERATED:START ${config.file} -->
    <section class="section section-compact" aria-label="Current ${escapeHtml(config.pageLabel)} in The Gambia">
      <div class="container">
        <h2 class="section-title">Current ${escapeHtml(config.pageLabel)} in The Gambia</h2>
        <p class="section-lead">${escapeHtml(config.introCopy)}</p>
        <div class="notice"><strong>Service areas:</strong> ${escapeHtml(config.locationCopy)}</div>
        <ul class="bullets">
${listMarkup}
        </ul>
      </div>
    </section>
<!-- SEO-GENERATED:END ${config.file} -->`;
}

function buildSchemaMarkup(config) {
  const items = getVisibleProducts(config.products).map((product, index) => {
    const summary = buildCatalogCardSummary(product);
    const description = normalizeSpace([product.description, summary.summary, summary.note].filter(Boolean).join(' '));
    const offer = Number.isFinite(Number(product?.price))
      ? {
          '@type': 'Offer',
          priceCurrency: 'GMD',
          price: Number(product.price),
          availability: 'https://schema.org/InStock',
          itemCondition: schemaConditionUrl(product),
          seller: { '@id': storeId },
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'GMD',
          availability: 'https://schema.org/InStock',
          itemCondition: schemaConditionUrl(product),
          seller: { '@id': storeId },
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'GMD',
            valueAddedTaxIncluded: false,
          },
        };

    return {
      '@type': 'ListItem',
      position: index + 1,
      url: buildAbsoluteHref(index, product, config.absoluteUrl),
      item: {
        '@type': 'Product',
        name: product.productTitle || product.title || `${config.sectionLabel} listing`,
        description,
        category: config.sectionLabel,
        itemCondition: schemaConditionUrl(product),
        offers: offer,
      },
    };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${config.absoluteUrl}#current-inventory`,
    name: `Current ${config.pageLabel} in The Gambia`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items,
  };

  return `<!-- SEO-SCHEMA:START ${config.file} -->\n  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>\n<!-- SEO-SCHEMA:END ${config.file} -->`;
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

  const sectionMarkup = buildSectionMarkup(config);
  const schemaMarkup = buildSchemaMarkup(config);

  const withSection = cleaned.replace(
    /(<div class="catalog-grid" id="catalogGrid"><\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/,
    `$1\n\n${sectionMarkup}`,
  );

  if (withSection === cleaned) {
    throw new Error(`Could not inject SEO section into ${config.file}`);
  }

  const withSchema = withSection.replace('</head>', `${schemaMarkup}\n</head>`);
  await writeFile(filePath, withSchema, 'utf8');
}

for (const config of pageConfigs) {
  await updatePage(config);
}
