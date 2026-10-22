import { describe, expect, it } from 'vitest';
import { buildProductSchema } from './generate-seo-snippets.mjs';

const config = { key: 'iphones', sectionLabel: 'iPhone' };
const listing = { title: 'Test iPhone', seoSlug: 'test-iphone', image: 'products/test.jpg' };

describe('published product structured data', () => {
  it('publishes the visible price and availability for an available device', () => {
    const schema = buildProductSchema(config, { ...listing, price: 13500 });
    expect(schema['@type']).toBe('Product');
    expect(schema.offers).toMatchObject({ price: 13500, priceCurrency: 'GMD', availability: 'https://schema.org/InStock' });
    expect(schema.offers.url).toBe(schema.url);
  });

  it.each([undefined, null, '', 0, -1, 'Price on request'])('keeps an unpriced listing indexable as a WebPage without inventing an offer (%s)', (price) => {
    const schema = buildProductSchema(config, { ...listing, price });
    expect(schema['@type']).toBe('WebPage');
    expect(schema.url).toBe('https://uncleapplestore.com/p/iphones/test-iphone/');
    expect(schema.image).toContain('https://uncleapplestore.com/products/test.jpg');
    expect(schema).not.toHaveProperty('offers');
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(schema).not.toHaveProperty('review');
    expect(schema).not.toHaveProperty('itemCondition');
  });

  it('does not publish a hidden old price for a sold device', () => {
    const schema = buildProductSchema(config, { ...listing, price: 13500, sold: true });
    expect(schema['@type']).toBe('WebPage');
    expect(schema).not.toHaveProperty('offers');
  });
});
