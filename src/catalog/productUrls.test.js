import { describe, expect, it } from 'vitest';
import { getProductPath, validateProductUrls } from './productUrls.js';
import { iphones } from './data/iphones.js';
import { buildProductSchema } from '../../scripts/generate-seo-snippets.mjs';
import { buildProductRedirectBlock } from '../../scripts/product-redirects.mjs';
import { renderCatalog } from './renderCatalog.js';

describe('permanent product URLs', () => {
  it('preserves every existing phone URL when a listing is inserted, removed or reordered', () => {
    const before = new Map(iphones.map(p => [p, getProductPath('iphones', p)]));
    const newListing = { title: 'New listing', seoSlug: 'new-listing-20261022' };
    const reordered = [newListing, ...iphones.toReversed().slice(1)];
    for (const product of reordered.slice(1)) {
      expect(getProductPath('iphones', product)).toBe(before.get(product));
    }
    expect(before.get(iphones.find(p => p.title === 'iPhone Duo')))
      .toBe('/p/iphones/iphone-duo-512gb-night-sky-45/');
  });

  it('keeps card links and schema aligned when product details and display position change', () => {
    const product = { ...iphones[0], title: 'Updated title', productTitle: 'New display title', price: 15000, images: [],
      variants: [{ storage: '64GB', price: 15000, seoSlug: 'variant-must-not-change-parent-url' }] };
    const config = { key: 'iphones', sectionLabel: 'iPhone' };
    const schema = buildProductSchema(config, product, 999);
    document.documentElement.dataset.category = 'iphones';
    const mountEl = document.createElement('div');
    renderCatalog({ mountEl, products: [product], startIndex: 999, detailIndices: [777] });
    expect(mountEl.querySelector('.catalog-actions a').getAttribute('href'))
      .toBe(getProductPath('iphones', product));
    expect(schema.url).toBe(`https://uncleapplestore.com${getProductPath('iphones', product)}`);
  });

  it('fails before generation for missing, unsafe or duplicate permanent addresses', () => {
    expect(() => validateProductUrls([{ key: 'iphones', products: [{ title: 'Missing slug' }] }])).toThrow(/seoSlug/);
    expect(() => getProductPath('iphones', { seoSlug: '../escape' })).toThrow(/seoSlug/);
    expect(() => validateProductUrls([{ key: 'iphones', products: [{ seoSlug: 'same' }, { seoSlug: 'same' }] }]))
      .toThrow(/Duplicate/);
  });

  it('only generates direct redirects to existing products without hijacking current pages', () => {
    const current = new Set(['/p/iphones/current/']);
    expect(buildProductRedirectBlock({ '/p/iphones/old/': '/p/iphones/current/' }, current))
      .toContain('/p/iphones/old/ /p/iphones/current/ 301');
    expect(() => buildProductRedirectBlock({ '/p/iphones/old/': '/p/iphones/missing/' }, current))
      .toThrow(/target/);
    expect(() => buildProductRedirectBlock({ '/p/iphones/current/': '/p/iphones/current/' }, current))
      .toThrow(/replace/);
  });
});
