import { describe, expect, it } from 'vitest';

import {
  buildBreadcrumbSchema,
  buildProductSchema,
  buildSchemaDescription,
  cleanDescriptionText,
  whatsappNumber,
} from './generate-seo-snippets.mjs';

describe('SEO description helpers', () => {
  it('cleans duplicated quality phrases', () => {
    expect(cleanDescriptionText('Good Good everyday condition.')).toBe('Good everyday condition.');
    expect(cleanDescriptionText('Excellent Very clean condition.')).toBe('Very clean condition.');
    expect(cleanDescriptionText('Ready to use. Ready to use.')).toBe('Ready to use.');
  });

  it('prefers the authored description and removes duplicate sentences', () => {
    const description = buildSchemaDescription(
      {
        description: 'Apple Pencil for iPad. Apple Pencil for iPad. Good Good everyday condition.',
      },
      {
        summary: 'Used • Good',
        note: 'Good everyday condition.',
      },
    );

    expect(description).toBe('Apple Pencil for iPad. Good everyday condition.');
  });

  it('falls back to summary and note when the product description is empty', () => {
    const description = buildSchemaDescription(
      { description: '' },
      {
        summary: '128GB • Like new • Battery 89%',
        note: 'Clean condition, strong battery. Factory unlocked. Dual SIM (SIM + eSIM).',
      },
    );

    expect(description).toBe('128GB • Like new • Battery 89% Clean condition, strong battery. Factory unlocked. Dual SIM (SIM + eSIM).');
  });

  it('uses the current Gambian WhatsApp number', () => {
    expect(whatsappNumber).toBe('220833013139');
  });

  it('identifies the product seller as Uncle Apple Store', () => {
    const config = {
      key: 'iphones',
      sectionLabel: 'iPhone',
      pageLabel: 'iPhones',
      absoluteUrl: 'https://uncleapplestore.com/',
    };
    const schema = buildProductSchema(config, {
      title: 'Test iPhone',
      price: 10000,
      image: 'products/placeholders/placeholder-phone.svg',
    }, 0);

    expect(schema.offers.seller).toEqual({
      '@type': 'ElectronicsStore',
      '@id': 'https://uncleapplestore.com/#store',
      name: 'Uncle Apple Store',
      url: 'https://uncleapplestore.com/',
      telephone: '+220833013139',
    });
  });

  it('builds a three-level breadcrumb for product pages', () => {
    const config = {
      key: 'iphones',
      pageLabel: 'iPhones',
      absoluteUrl: 'https://uncleapplestore.com/',
    };
    const schema = {
      name: 'Test iPhone',
      url: 'https://uncleapplestore.com/p/iphones/test-iphone-1/',
    };

    const breadcrumb = buildBreadcrumbSchema(config, schema);

    expect(breadcrumb['@type']).toBe('BreadcrumbList');
    expect(breadcrumb.itemListElement).toHaveLength(3);
    expect(breadcrumb.itemListElement[1]).toMatchObject({
      name: 'iPhones',
      item: 'https://uncleapplestore.com/buy-iphone-gambia/',
    });
  });
});
