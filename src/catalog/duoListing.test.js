import { describe, expect, it } from 'vitest';
import { iphones } from './data/iphones.js';
import { getNewestListings } from './listingDates.js';
import { renderCatalog } from './renderCatalog.js';
import { WHATSAPP_NUMBER_E164 } from '../contactConfig.js';

describe('iPhone Duo price requests', () => {
  it('shows the new listing without a numeric price and links to a product-specific WhatsApp request', () => {
    const product = iphones.find((item) => item.title === 'iPhone Duo');
    expect(getNewestListings(iphones)[0].product).toBe(product);
    expect(product.price).toBeUndefined();

    const mountEl = document.createElement('div');
    renderCatalog({ mountEl, products: [product] });
    expect(mountEl.textContent).toMatch(/Price on request/i);
    expect(mountEl.textContent).not.toMatch(/GMD\s*[\d,]+/);

    const link = [...mountEl.querySelectorAll('a')].find((item) => item.textContent === 'Request price on WhatsApp');
    expect(link).toBeDefined();
    const url = new URL(link.href);
    expect(url.pathname).toBe(`/${WHATSAPP_NUMBER_E164}`);
    expect(url.searchParams.get('text')).toContain('iPhone Duo, 512GB, Night Sky');
    expect(url.searchParams.get('text')).toContain('free original Apple case');
    expect(url.searchParams.get('text')).not.toMatch(/260[,.]?000/);
  });
});
