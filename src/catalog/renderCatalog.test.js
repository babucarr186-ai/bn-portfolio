import { describe, expect, it } from 'vitest';

import { buildCatalogCardSummary, renderCatalog, renderRecommendationRail } from './renderCatalog.js';

describe('buildCatalogCardSummary', () => {
  it('surfaces dual-SIM unlock details without duplicating them', () => {
    const result = buildCatalogCardSummary({
      subtitle: '256GB • Excellent • Battery 83%',
      description: 'Factory unlocked. Dual SIM (SIM + eSIM). No SIM lock.',
      price: 21000,
    });

    expect(result.summary).toBe('256GB • Excellent • Battery 83%');
    expect(result.note).toContain('Very clean condition, good battery.');
    expect(result.note).toContain('Factory unlocked.');
    expect(result.note).toContain('Dual SIM (SIM + eSIM).');
    expect(result.note).not.toContain('No SIM lock.');
    expect(result.priceLabel).toBe('GMD 21,000');
  });

  it('falls back to a ready-to-use note when no condition metadata exists', () => {
    const result = buildCatalogCardSummary({
      description: 'Basic listing with no extra metadata.',
    });

    expect(result.summary).toBe('');
    expect(result.note).toBe('Ready to use.');
    expect(result.priceLabel).toBe('');
  });
});

describe('renderRecommendationRail', () => {
  it('mounts the rail before enabling autoplay clones', () => {
    const mountEl = document.createElement('div');
    document.body.appendChild(mountEl);

    renderRecommendationRail({
      mountEl,
      items: [
        {
          href: '#product-1',
          title: 'iPhone 13',
          summary: '128GB • Battery 86%',
          priceLabel: 'GMD 23,000',
          categoryLabel: 'iPhone',
          product: { images: ['/products/placeholders/placeholder-phone.svg'] },
        },
        {
          href: '#product-2',
          title: 'iPad 10',
          summary: '64GB • Very clean',
          priceLabel: 'GMD 26,000',
          categoryLabel: 'iPad',
          product: { images: ['/products/placeholders/placeholder-phone.svg'] },
        },
      ],
    });

    const section = mountEl.querySelector('.catalog-recommendations');
    const rail = mountEl.querySelector('.catalog-rail');

    expect(section).toBeInTheDocument();
    expect(rail).toBeInTheDocument();
    expect(rail?.isConnected).toBe(true);
    expect(rail?.querySelectorAll('.catalog-rail-card').length).toBe(4);
    expect(rail?.querySelectorAll('.catalog-rail-card-clone').length).toBe(2);

    mountEl.remove();
  });
});

describe('renderCatalog', () => {
  it('gives Buy Now a direct WhatsApp href even without the helper', () => {
    const previousHelper = window.setWhatsAppHref;
    const mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    delete window.setWhatsAppHref;

    renderCatalog({
      mountEl,
      products: [
        {
          title: 'iPhone 12',
          subtitle: '128GB • Very clean • Battery 84%',
          price: 24500,
          description: 'Factory unlocked. Dual SIM (SIM + eSIM).',
          images: ['/products/placeholders/placeholder-phone.svg'],
        },
      ],
    });

    const buyNow = mountEl.querySelector('.catalog-actions a.btn-primary');

    expect(buyNow).toBeInTheDocument();
    expect(buyNow?.getAttribute('href')).toContain('https://wa.me/4915679652076?text=');
    expect(buyNow?.getAttribute('target')).toBe('_blank');

    if (previousHelper) {
      window.setWhatsAppHref = previousHelper;
    }
    mountEl.remove();
  });
});