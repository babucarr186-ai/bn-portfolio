import { readFile, writeFile } from 'node:fs/promises';
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

function getVisibleProducts(products) {
  return (Array.isArray(products) ? products : []).filter((product) => !product?.sold).slice(0, 12);
}

function buildAbsoluteHref(index, product, absoluteUrl) {
  const id = `product-${slugify(product?.title || `product-${index + 1}`)}-${index + 1}`;
  return `${absoluteUrl}#${id}`;
}

function buildSchemaMarkup(config) {
  const items = getVisibleProducts(config.products).map((product, index) => {
    const summary = buildCatalogCardSummary(product);
    const description = buildSchemaDescription(product, summary);
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

  const schemaMarkup = buildSchemaMarkup(config);

  const withSchema = cleaned.replace('</head>', `${schemaMarkup}\n</head>`);
  await writeFile(filePath, withSchema, 'utf8');
}

export async function generateSeoSnippets() {
  for (const config of pageConfigs) {
    await updatePage(config);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await generateSeoSnippets();
}
