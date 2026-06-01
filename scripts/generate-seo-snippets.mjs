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
const whatsappNumber = '4915679652076';
const sharedLocationCopy = 'The Gambia, Banjul, Serrekunda, Brikama, Bakau, and nearby delivery routes. Dakar requests can be confirmed on WhatsApp before payment.';

const pageConfigs = [
  {
    key: 'iphones',
    file: 'index.html',
    absoluteUrl: `${siteOrigin}/`,
    sectionLabel: 'iPhone',
    pageLabel: 'iPhones',
    locationCopy: sharedLocationCopy,
    products: iphones,
  },
  {
    key: 'ipads',
    file: 'ipads.html',
    absoluteUrl: `${siteOrigin}/ipads.html`,
    sectionLabel: 'iPad',
    pageLabel: 'iPads',
    locationCopy: sharedLocationCopy,
    products: ipads,
  },
  {
    key: 'macbooks',
    file: 'macbook.html',
    absoluteUrl: `${siteOrigin}/macbook.html`,
    sectionLabel: 'MacBook',
    pageLabel: 'MacBooks',
    locationCopy: sharedLocationCopy,
    products: macbooks,
  },
  {
    key: 'watches',
    file: 'apple-watch.html',
    absoluteUrl: `${siteOrigin}/apple-watch.html`,
    sectionLabel: 'Apple Watch',
    pageLabel: 'Apple Watch listings',
    locationCopy: sharedLocationCopy,
    products: watches,
  },
  {
    key: 'airpods',
    file: 'airpods.html',
    absoluteUrl: `${siteOrigin}/airpods.html`,
    sectionLabel: 'AirPods',
    pageLabel: 'AirPods listings',
    locationCopy: sharedLocationCopy,
    products: airpods,
  },
  {
    key: 'giftcards',
    file: 'gift-cards.html',
    absoluteUrl: `${siteOrigin}/gift-cards.html`,
    sectionLabel: 'Apple Gift Card',
    pageLabel: 'Apple Gift Card listings',
    locationCopy: sharedLocationCopy,
    products: giftCards,
  },
  {
    key: 'accessories',
    file: 'accessories.html',
    absoluteUrl: `${siteOrigin}/accessories.html`,
    sectionLabel: 'Apple accessory',
    pageLabel: 'Apple accessory listings',
    locationCopy: sharedLocationCopy,
    products: accessories,
  },
  {
    key: 'appletvhome',
    file: 'apple-tv-home.html',
    absoluteUrl: `${siteOrigin}/apple-tv-home.html`,
    sectionLabel: 'Apple TV and Home',
    pageLabel: 'Apple TV and Home listings',
    locationCopy: sharedLocationCopy,
    products: appleTvHome,
  },
];

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return normalizeSpace(value)
    .toLowerCase()
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

function escapeAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitSentences(value) {
  return normalizeSpace(value)
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

function asTextArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeSpace(item)).filter(Boolean);
}

function uniqueText(values) {
  const seen = new Set();
  const result = [];

  values.forEach((item) => {
    const text = normalizeSpace(item);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });

  return result;
}

function hasTopic(items, pattern) {
  return items.some((item) => pattern.test(normalizeSpace(item)));
}

function normalizeSchemaPrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (value === null || value === undefined || value === '') return null;

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function formatCurrency(value) {
  const price = normalizeSchemaPrice(value);
  if (price === null) return 'Price on request';
  return `GMD ${new Intl.NumberFormat('en-US').format(price)}`;
}

function toAbsoluteUrl(value) {
  const raw = normalizeSpace(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${siteOrigin}/${raw.replace(/^\/+/, '')}`;
}

function pickProductImages(product) {
  const inputs = [];
  if (Array.isArray(product?.images)) inputs.push(...product.images);
  if (product?.image) inputs.push(product.image);

  return uniqueText(
    inputs
      .map((image) => normalizeSpace(image))
      .filter(Boolean)
      .map((image) => image.replace(/\?.*$/, ''))
      .map(toAbsoluteUrl),
  ).slice(0, 8);
}

function schemaConditionUrl(product) {
  const condition = normalizeSpace(product?.condition || product?.subtitle).toLowerCase();
  if (condition.includes('brand new') || condition.includes('sealed')) {
    return 'https://schema.org/NewCondition';
  }
  return 'https://schema.org/UsedCondition';
}

function schemaAvailabilityUrl(product) {
  return product?.sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';
}

function buildProductSlug(product, index) {
  const base = slugify(product?.productTitle || product?.title || 'product') || 'product';
  return `${base}-${index + 1}`;
}

function buildProductUrl(config, product, index) {
  return `${siteOrigin}${productPathBase}/${config.key}/${buildProductSlug(product, index)}/`;
}

function buildWhatsAppLink(message) {
  const text = normalizeSpace(message || 'Hi Uncle Apple! Please confirm availability for this device.');
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function containsText(product, pattern) {
  const haystack = [
    product?.title,
    product?.subtitle,
    product?.description,
    product?.shortDescription,
    product?.longDescription,
    product?.authenticity,
    product?.certification,
    product?.importedFrom,
    ...(Array.isArray(product?.keyFeatures) ? product.keyFeatures : []),
    ...(Array.isArray(product?.conditionReport) ? product.conditionReport : []),
    ...(Array.isArray(product?.trustItems) ? product.trustItems : []),
  ]
    .map((item) => normalizeSpace(item))
    .filter(Boolean)
    .join(' ');

  return pattern.test(haystack);
}

function buildPartsStatus(product) {
  if (normalizeSpace(product?.authenticity)) return normalizeSpace(product.authenticity);
  if (containsText(product, /original parts/i)) return 'Original parts';
  return 'Checked by Uncle Apple Store';
}

function buildNetworkStatus(product) {
  const description = [product?.subtitle, product?.description].map((item) => normalizeSpace(item)).join(' ');
  if (/dual sim|sim\s*\+\s*esim|nano.?sim\s*\+\s*esim/i.test(description)) return 'Dual SIM (SIM + eSIM)';
  if (/factory unlocked|frei ab werk|no sim lock|ohne simlock/i.test(description)) return 'Factory unlocked';
  return 'Unlocked network';
}

function buildFaceIdStatus(product, config) {
  if (config.key !== 'iphones') return 'Not applicable';
  if (/iphone\s*(se|7|8)\b/i.test(normalizeSpace(product?.title))) return 'Touch ID model';
  if (containsText(product, /face id/i)) return 'Face ID tested';
  return 'Face ID tested';
}

function buildGeneratedMetaDescription(product, config, fields) {
  const title = normalizeSpace(product?.pageTitle || product?.productTitle || product?.title || `${config.sectionLabel} listing`);
  const partsStatus = buildPartsStatus(product);
  const importedFrom = normalizeSpace(product?.importedFrom || product?.origin);
  return normalizeSpace(
    `${title} from Uncle Apple Store in The Gambia. ${fields.condition} condition.${fields.batteryHealth ? ` ${fields.batteryHealth} battery health.` : ''}${fields.storage ? ` ${fields.storage} storage.` : ''} ${partsStatus}.${importedFrom ? ` ${importedFrom}.` : ''} ${formatCurrency(product?.price)}.`,
  );
}

function buildGeneratedShortDescription(product, config, fields) {
  const title = normalizeSpace(product?.title || product?.pageTitle || config.sectionLabel);
  return normalizeSpace(
    `${title} with ${fields.storage || 'clear device details'}, ${fields.batteryHealth ? `${fields.batteryHealth} battery health, ` : ''}${fields.partsStatus.toLowerCase()}, and ${fields.condition.toLowerCase()} presentation for buyers who want Apple-quality hardware with transparent condition reporting.`,
  );
}

function buildGeneratedLongDescription(product, config, fields) {
  const importedFrom = normalizeSpace(product?.importedFrom || product?.origin);
  return normalizeSpace(
    `${normalizeSpace(product?.title || config.sectionLabel)} is presented in ${fields.color ? `${fields.color.toLowerCase()} ` : ''}${fields.condition.toLowerCase()} condition with ${fields.storage || 'clear storage information'} and ${fields.batteryHealth ? `${fields.batteryHealth} battery health` : 'transparent battery reporting'}. ${fields.partsStatus} and ${fields.network.toLowerCase()} support are stated clearly before payment.${importedFrom ? ` ${importedFrom}.` : ''} ${config.locationCopy}`,
  );
}

function buildProductSchema(config, product, index) {
  const summary = buildCatalogCardSummary(product);
  const description = normalizeSpace(product?.seoMetaDescription) || buildSchemaDescription(product, summary);
  const url = buildProductUrl(config, product, index);
  const price = normalizeSchemaPrice(product?.price);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: normalizeSpace(product?.pageTitle || product?.productTitle || product?.title || `${config.sectionLabel} listing`),
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

function buildItemListSchema(config, productSchemas) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${config.absoluteUrl}#current-inventory`,
    name: `Current ${config.pageLabel} in The Gambia`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: productSchemas.length,
    itemListElement: productSchemas.map((schema, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: schema.url,
      item: { '@id': schema['@id'] },
    })),
  };
}

function buildSchemaMarkup(config) {
  const productSchemas = config.products.map((product, index) => buildProductSchema(config, product, index));
  const schemas = [buildItemListSchema(config, productSchemas), ...productSchemas];

  return `<!-- SEO-SCHEMA:START ${config.file} -->\n  <script type="application/ld+json">\n${JSON.stringify(schemas, null, 2)}\n  </script>\n<!-- SEO-SCHEMA:END ${config.file} -->`;
}

function stripGeneratedBlocks(content, file) {
  const escapedFile = escapeRegExp(file);
  return content
    .replace(new RegExp(`\\n?<!-- SEO-GENERATED:START ${escapedFile} -->[\\s\\S]*?<!-- SEO-GENERATED:END ${escapedFile} -->`, 'g'), '')
    .replace(new RegExp(`\\n?<!-- SEO-SCHEMA:START ${escapedFile} -->[\\s\\S]*?<!-- SEO-SCHEMA:END ${escapedFile} -->`, 'g'), '');
}

async function updatePage(config) {
  const pagePath = resolve(projectRoot, config.file);
  const raw = await readFile(pagePath, 'utf8');
  const next = stripGeneratedBlocks(raw, config.file).replace('</head>', `${buildSchemaMarkup(config)}\n</head>`);
  await writeFile(pagePath, next, 'utf8');
}

function renderTextList(items, className = 'product-list') {
  const values = asTextArray(items);
  if (!values.length) return '<p>Information available on request.</p>';
  return `<ul class="${className}">${values.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderTagRow(items) {
  const values = asTextArray(items);
  if (!values.length) return '';
  return `<div class="product-highlight-row">${values.map((item) => `<span class="product-tag">${escapeHtml(item)}</span>`).join('')}</div>`;
}

function buildProductPageViewModel(config, product, schema) {
  const pageTitle = normalizeSpace(product?.pageTitle || schema.name);
  const color = normalizeSpace(product?.color);
  const storage = normalizeSpace(product?.storage);
  const batteryHealth = normalizeSpace(product?.batteryHealth);
  const condition = normalizeSpace(product?.condition || 'Ready to use');
  const partsStatus = buildPartsStatus(product);
  const network = buildNetworkStatus(product);
  const faceIdStatus = buildFaceIdStatus(product, config);
  const metaTitle = normalizeSpace(product?.seoMetaTitle || `${pageTitle} | Uncle Apple Store`);
  const fallbackMetaDescription = buildGeneratedMetaDescription(product, config, {
    storage,
    batteryHealth,
    condition,
    partsStatus,
  });
  const metaDescription = normalizeSpace(product?.seoMetaDescription || schema.description || fallbackMetaDescription);
  const shortDescription = normalizeSpace(product?.shortDescription || buildGeneratedShortDescription(product, config, {
    storage,
    batteryHealth,
    condition,
    partsStatus,
  }));
  const fullDescription = normalizeSpace(product?.longDescription || buildGeneratedLongDescription(product, config, {
    color,
    storage,
    batteryHealth,
    condition,
    partsStatus,
    network,
  }));
  const authenticity = normalizeSpace(product?.authenticity || product?.parts || 'Authenticity checked');
  const importedFrom = normalizeSpace(product?.importedFrom || product?.origin);
  const importedFromLine = importedFrom
    ? /^imported from\b/i.test(importedFrom)
      ? importedFrom
      : `Imported from ${importedFrom}.`
    : '';
  const certification = normalizeSpace(product?.certification);
  const availabilityText = product?.sold ? 'Sold out' : 'Available now';
  const priceText = formatCurrency(product?.price);

  const authoredHighlights = asTextArray(product?.productHighlights);
  const authoredKeyFeatures = uniqueText([
    ...asTextArray(product?.keyFeatures),
    ...asTextArray(product?.specs),
  ]);
  const authoredConditionReport = asTextArray(product?.conditionReport);

  const productHighlights = uniqueText([
    ...authoredHighlights,
    color && !hasTopic(authoredHighlights, /\b(color|gold|silver|black|white|blue|green|pink|lavender|purple|midnight|starlight|space gray|space grey|titanium|natural)\b/i) ? color : '',
    storage && !hasTopic(authoredHighlights, /\b\d+\s*(gb|tb)\b|\bstorage\b/i) ? `${storage} storage` : '',
    batteryHealth && !hasTopic(authoredHighlights, /\bbattery\b/i) ? `Battery health ${batteryHealth}` : '',
    condition && !hasTopic(authoredHighlights, /\b(condition|used|new|clean|excellent|good|like new|very clean|sealed)\b/i) ? condition : '',
    authenticity && !hasTopic(authoredHighlights, /\b(authenticity|original parts|parts status|parts)\b/i) ? authenticity : '',
    importedFrom && !hasTopic(authoredHighlights, /\bimported from\b|\bgermany\b|\busa\b|\buk\b|\bdubai\b/i) ? importedFrom : '',
    certification,
  ]);

  const keyFeatures = uniqueText([
    ...authoredKeyFeatures,
    storage && !hasTopic(authoredKeyFeatures, /\b\d+\s*(gb|tb)\b|\bstorage\b/i) ? `${storage} storage` : '',
    batteryHealth && !hasTopic(authoredKeyFeatures, /\bbattery\b/i) ? `Battery health ${batteryHealth}` : '',
  ]);

  const conditionReport = uniqueText([
    ...authoredConditionReport,
    condition && !hasTopic(authoredConditionReport, /\bcondition\b|\bused\b|\bnew\b|\bclean\b|\bexcellent\b|\bgood\b|\blike new\b|\bvery clean\b|\bsealed\b/i) ? `Condition: ${condition}` : '',
    batteryHealth && !hasTopic(authoredConditionReport, /\bbattery\b/i) ? `Battery health: ${batteryHealth}` : '',
    authenticity && !hasTopic(authoredConditionReport, /\b(authenticity|original parts|parts status|parts)\b/i) ? `Authenticity: ${authenticity}` : '',
  ]);

  const authoredTrustItems = asTextArray(product?.trustItems);
  const hasAuthoredImportLine = authoredTrustItems.some((item) => /imported from/i.test(item));

  const trustItems = uniqueText([
    ...authoredTrustItems,
    hasAuthoredImportLine ? '' : importedFromLine,
    certification,
    config.locationCopy,
  ]);

  const trustChecks = uniqueText([
    importedFromLine || 'Imported from Germany',
    'Device Fully Tested',
    'Honest Battery Reporting',
    faceIdStatus === 'Touch ID model' ? 'Biometric status checked' : 'Face ID Tested',
    'Uncle Apple Store Verified',
  ]);

  const heroBadges = uniqueText([
    batteryHealth ? `Battery ${batteryHealth}` : '',
    storage,
    color,
    condition,
    /original parts/i.test(partsStatus) ? 'Original Parts' : '',
  ]);

  const specRows = [
    { label: 'Storage', value: storage || 'Not specified' },
    { label: 'Color', value: color || 'Not specified' },
    { label: 'Battery Health', value: batteryHealth || 'Not specified' },
    { label: 'Condition', value: condition },
    { label: 'Parts Status', value: partsStatus },
    { label: 'Network', value: network },
    { label: 'Face ID Status', value: faceIdStatus },
  ];

  return {
    pageTitle,
    metaTitle,
    metaDescription,
    shortDescription,
    fullDescription,
    priceText,
    availabilityText,
    whatsappHref: buildWhatsAppLink(product?.whatsAppMessage),
    trustTitle: normalizeSpace(product?.trustTitle || 'Why buyers trust Uncle Apple Store'),
    ctaTitle: normalizeSpace(product?.ctaTitle || 'Ready to confirm this device?'),
    ctaText: normalizeSpace(
      product?.ctaText ||
        'Chat with Uncle Apple Store on WhatsApp to confirm availability, ask questions, and arrange the next step before payment.',
    ),
    ctaPrimaryLabel: normalizeSpace(product?.ctaPrimaryLabel || 'Chat on WhatsApp'),
    ctaSecondaryLabel: normalizeSpace(product?.ctaSecondaryLabel || 'Back to listings'),
    heroEyebrow: normalizeSpace(product?.heroEyebrow || `${config.sectionLabel} listing`),
    heroBadges,
    productHighlights,
    keyFeatures,
    conditionReport,
    trustItems,
    trustChecks,
    specRows,
    details: [
      { label: 'Storage', value: storage || 'Not specified' },
      { label: 'Battery health', value: batteryHealth || 'Not specified' },
      { label: 'Condition', value: condition },
      { label: 'Authenticity', value: authenticity },
      { label: 'Color', value: color || 'Not specified' },
      { label: 'Status', value: availabilityText },
    ],
  };
}

function buildProductPageHtml(config, product, index) {
  const schema = buildProductSchema(config, product, index);
  const viewModel = buildProductPageViewModel(config, product, schema);
  const canonical = schema.url;
  const galleryImages = schema.image.length ? schema.image : [`${siteOrigin}/products/placeholders/placeholder-phone.svg`];
  const primaryImage = galleryImages[0];
  const backLink = config.absoluteUrl;
  const galleryMarkup = galleryImages.length > 1
    ? `<div class="product-thumb-row">${galleryImages.slice(0, 4).map((image, imageIndex) => `<div class="product-thumb"><img src="${escapeAttribute(image)}" alt="${escapeAttribute(`${viewModel.pageTitle} view ${imageIndex + 1}`)}" loading="lazy" decoding="async" /></div>`).join('')}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(viewModel.metaTitle)}</title>
  <meta name="description" content="${escapeAttribute(viewModel.metaDescription)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${escapeAttribute(canonical)}" />
  <meta property="og:site_name" content="Uncle Apple Store" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeAttribute(viewModel.metaTitle)}" />
  <meta property="og:description" content="${escapeAttribute(viewModel.metaDescription)}" />
  <meta property="og:url" content="${escapeAttribute(canonical)}" />
  <meta property="og:image" content="${escapeAttribute(primaryImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttribute(viewModel.metaTitle)}" />
  <meta name="twitter:description" content="${escapeAttribute(viewModel.metaDescription)}" />
  <meta name="twitter:image" content="${escapeAttribute(primaryImage)}" />
  <link rel="stylesheet" href="/site.css?v=20260304" />
  <style>
    .product-page{padding:30px 0 52px;background:#fff}
    .product-shell{width:min(1400px,calc(100% - 40px));margin:0 auto;display:grid;gap:18px}
    .product-summary-card,.product-media-card,.product-content-grid{display:grid;gap:18px}
    .product-hero{display:grid;gap:18px;align-items:stretch}
    .product-card{background:rgba(255,255,255,.94);border:1px solid rgba(11,15,22,.08);border-radius:28px;box-shadow:0 24px 80px rgba(15,23,42,.08);overflow:hidden}
    .product-media-card,.product-summary-card,.product-section-card{padding:22px}
    .product-media-card{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(242,245,248,.92))}
    .product-media-stage{min-height:300px;border-radius:22px;background:linear-gradient(180deg,#ffffff 0%,#eef2f6 100%);display:grid;place-items:center;padding:26px;border:1px solid rgba(11,15,22,.06)}
    .product-media-stage img{width:100%;max-height:380px;object-fit:contain}
    .product-thumb-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .product-thumb{border-radius:16px;padding:10px;border:1px solid rgba(11,15,22,.08);background:#fff;min-height:74px;display:grid;place-items:center}
    .product-thumb img{max-height:58px;object-fit:contain}
    .product-eyebrow{margin:0;font-size:.78rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(11,15,22,.56)}
    .product-title{margin:0;font-size:clamp(2rem,6vw,3.8rem);line-height:.98;letter-spacing:-.045em;font-family:"SF Pro Display","SF Pro Text",ui-sans-serif,system-ui,-apple-system,sans-serif}
    .product-short,.product-section-card p{margin:0;line-height:1.7;color:rgba(11,15,22,.72)}
    .product-highlight-row{display:flex;flex-wrap:wrap;gap:10px}
    .product-trust-strip{display:grid;gap:12px;padding:18px 22px}
    .product-trust-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
    .product-trust-item{display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:18px;background:rgba(245,247,250,.88);border:1px solid rgba(11,15,22,.06);font-weight:700;color:#0b0f16}
    .product-trust-item::before{content:"✓";display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:#0b0f16;color:#fff;font-size:.8rem;flex:0 0 auto}
    .product-tag{display:inline-flex;align-items:center;padding:9px 14px;border-radius:999px;background:rgba(11,15,22,.04);border:1px solid rgba(11,15,22,.08);font-weight:700;font-size:.92rem;color:rgba(11,15,22,.82)}
    .product-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .product-detail-item{padding:16px;border-radius:20px;background:rgba(245,247,250,.9);border:1px solid rgba(11,15,22,.06)}
    .product-detail-label{display:block;font-size:.78rem;font-weight:700;color:rgba(11,15,22,.52);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
    .product-detail-value{display:block;font-size:1rem;font-weight:800;color:#0b0f16}
    .product-purchase-card{display:grid;gap:12px;padding:18px;border-radius:24px;background:linear-gradient(180deg,rgba(11,15,22,.03),rgba(11,15,22,.01));border:1px solid rgba(11,15,22,.06)}
    .product-price{font-size:clamp(1.75rem,6vw,2.5rem);line-height:1;letter-spacing:-.04em;font-weight:900}
    .product-status{display:inline-flex;align-items:center;gap:8px;font-size:.95rem;color:rgba(11,15,22,.64);font-weight:700}
    .product-dot{width:9px;height:9px;border-radius:999px;background:#16a34a;box-shadow:0 0 0 6px rgba(22,163,74,.12)}
    .product-actions{display:flex;flex-direction:column;gap:10px}
    .product-actions .btn{width:100%;min-height:50px}
    .product-list{margin:0;padding-left:18px;display:grid;gap:10px;color:rgba(11,15,22,.76)}
    .product-list li::marker{color:rgba(11,15,22,.42)}
    .product-spec-table{width:100%;border-collapse:collapse}
    .product-spec-table th,.product-spec-table td{padding:14px 0;border-bottom:1px solid rgba(11,15,22,.08);text-align:left;vertical-align:top}
    .product-spec-table th{width:34%;font-size:.84rem;letter-spacing:.04em;text-transform:uppercase;color:rgba(11,15,22,.52)}
    .product-spec-table td{font-weight:700;color:#0b0f16}
    .product-trust-card{background:linear-gradient(180deg,rgba(11,15,22,.96),rgba(22,28,39,.94));color:#fff}
    .product-trust-card h2,.product-trust-card p,.product-trust-card .product-list{color:inherit}
    .product-trust-card .product-list li::marker{color:rgba(255,255,255,.66)}
    .product-cta-card{background:linear-gradient(135deg,rgba(248,250,252,.96),rgba(236,242,247,.96))}
    @media (min-width:900px){.product-hero{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr)}.product-content-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.product-section-card--wide,.product-trust-card,.product-cta-card{grid-column:1/-1}.product-actions{flex-direction:row}}
    @media (max-width:767px){.product-page{padding-top:18px}.product-media-card,.product-summary-card,.product-section-card,.product-trust-strip{padding:18px}.product-detail-grid{grid-template-columns:1fr}.product-media-stage{min-height:240px;padding:20px}.product-thumb-row{grid-template-columns:repeat(2,minmax(0,1fr))}.product-trust-grid{grid-template-columns:1fr}.product-spec-table th,.product-spec-table td{display:block;width:100%;padding:8px 0}.product-spec-table th{padding-top:14px}.product-actions .btn{width:100%}}
  </style>
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body data-page="product">
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
    <section class="section product-page" aria-label="Product details">
      <div class="container product-shell">
        <div class="product-hero">
          <article class="product-card product-media-card" aria-label="Product media">
            <div class="product-media-stage">
              <img src="${escapeAttribute(primaryImage)}" alt="${escapeAttribute(viewModel.pageTitle)}" loading="eager" decoding="async" />
            </div>
            ${galleryMarkup}
          </article>
          <article class="product-card product-summary-card">
            <p class="product-eyebrow">${escapeHtml(viewModel.heroEyebrow)}</p>
            <h1 class="product-title">${escapeHtml(viewModel.pageTitle)}</h1>
            <p class="product-short">${escapeHtml(viewModel.shortDescription)}</p>
            ${renderTagRow(viewModel.heroBadges)}
            <div class="product-detail-grid">
              ${viewModel.details.map((detail) => `<div class="product-detail-item"><span class="product-detail-label">${escapeHtml(detail.label)}</span><span class="product-detail-value">${escapeHtml(detail.value)}</span></div>`).join('')}
            </div>
            <div class="product-purchase-card">
              <div class="product-price">${escapeHtml(viewModel.priceText)}</div>
              <div class="product-status"><span class="product-dot" aria-hidden="true"></span>${escapeHtml(viewModel.availabilityText)}</div>
              <div class="product-actions">
                <a class="btn btn-whatsapp" href="${escapeAttribute(viewModel.whatsappHref)}" target="_blank" rel="noopener">${escapeHtml(viewModel.ctaPrimaryLabel)}</a>
                <a class="btn btn-primary" href="${escapeAttribute(backLink)}">${escapeHtml(viewModel.ctaSecondaryLabel)}</a>
              </div>
            </div>
          </article>
        </div>
        <article class="product-card product-trust-strip">
          <div class="product-trust-grid">
            ${viewModel.trustChecks.map((item) => `<div class="product-trust-item">${escapeHtml(item)}</div>`).join('')}
          </div>
        </article>
        <div class="product-content-grid">
          <article class="product-card product-section-card product-section-card--wide">
            <h2>Short Description</h2>
            <p>${escapeHtml(viewModel.shortDescription)}</p>
          </article>
          <article class="product-card product-section-card product-section-card--wide">
            <h2>Full Product Description</h2>
            <p>${escapeHtml(viewModel.fullDescription)}</p>
          </article>
          <article class="product-card product-section-card">
            <h2>Key Features</h2>
            ${renderTextList(viewModel.keyFeatures)}
          </article>
          <article class="product-card product-section-card">
            <h2>Condition Report</h2>
            ${renderTextList(viewModel.conditionReport)}
          </article>
          <article class="product-card product-section-card">
            <h2>Product Specifications</h2>
            <table class="product-spec-table">
              <tbody>
                ${viewModel.specRows.map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`).join('')}
              </tbody>
            </table>
          </article>
          <article class="product-card product-section-card">
            <h2>Product Highlights</h2>
            ${renderTextList(viewModel.productHighlights)}
          </article>
          <article class="product-card product-section-card product-trust-card">
            <h2>${escapeHtml(viewModel.trustTitle)}</h2>
            ${renderTextList(viewModel.trustItems)}
          </article>
          <article class="product-card product-section-card product-cta-card">
            <h2>${escapeHtml(viewModel.ctaTitle)}</h2>
            <p>${escapeHtml(viewModel.ctaText)}</p>
            <div class="product-actions" style="margin-top:14px">
              <a class="btn btn-whatsapp" href="${escapeAttribute(viewModel.whatsappHref)}" target="_blank" rel="noopener">${escapeHtml(viewModel.ctaPrimaryLabel)}</a>
              <a class="btn btn-primary" href="${escapeAttribute(backLink)}">${escapeHtml(viewModel.ctaSecondaryLabel)}</a>
            </div>
          </article>
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
    for (let index = 0; index < config.products.length; index += 1) {
      const product = config.products[index];
      const outDir = resolve(outRoot, config.key, buildProductSlug(product, index));
      await mkdir(outDir, { recursive: true });
      await writeFile(resolve(outDir, 'index.html'), buildProductPageHtml(config, product, index), 'utf8');
    }
  }
}

function stripGeneratedSitemapBlock(content) {
  return content.replace(/\n?<!-- SEO-PRODUCT-URLS:START -->[\s\S]*?<!-- SEO-PRODUCT-URLS:END -->\n?/g, '');
}

function buildSitemapProductBlock(urls) {
  return `<!-- SEO-PRODUCT-URLS:START -->\n${urls.map((url) => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n    <priority>0.3</priority>\n  </url>`).join('\n')}\n<!-- SEO-PRODUCT-URLS:END -->`;
}

async function updateSitemap() {
  const sitemapPath = resolve(projectRoot, 'public', 'sitemap.xml');
  const raw = await readFile(sitemapPath, 'utf8');
  const urls = [];

  pageConfigs.forEach((config) => {
    config.products.forEach((product, index) => {
      urls.push(buildProductUrl(config, product, index));
    });
  });

  const next = stripGeneratedSitemapBlock(raw).replace(/\s*<\/urlset>\s*$/i, `\n${buildSitemapProductBlock(urls)}\n</urlset>\n`);
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
