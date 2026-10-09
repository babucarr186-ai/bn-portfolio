import { describe, expect, it } from 'vitest';
import { getListingDate, formatListingDate, getNewestListings } from './listingDates.js';
import { renderCatalog, buildCatalogProductId } from './renderCatalog.js';
import { watches } from './data/watches.js';

describe('listing dates', () => {
  it('sorts newest first without changing catalog indexes or undated order', () => {
    const products = [{ title: 'Legacy' }, { listingDate: '2026-10-06' }, { title: 'Legacy 2' }, { listingDate: '2026-10-09' }, { listingDate: '2026-10-09' }];
    expect(getNewestListings(products).map(({ index }) => index)).toEqual([4, 3, 1, 0, 2]);
    expect(products[0].title).toBe('Legacy');
  });
  it('ignores missing, malformed and impossible dates', () => {
    for (const listingDate of [undefined, 'bad', '2026-02-30', '2026-13-01']) expect(getListingDate({ listingDate })).toBe('');
    expect(formatListingDate({ listingDate: '2026-10-09' })).toBe('9 Oct 2026');
  });
  it('puts the new watch first with its original product and hash links', () => {
    const entries = getNewestListings(watches);
    expect(entries[0].product.title).toBe('Apple Watch Series 8 (45mm)');
    document.documentElement.dataset.category = 'watches';
    document.body.innerHTML = '<div id="grid"></div>';
    renderCatalog({ mountEl: document.querySelector('#grid'), products: entries.map(x => x.product), detailIndices: entries.map(x => x.index), cardIndices: entries.map(x => x.index) });
    const first = document.querySelector('.catalog-card');
    expect(first.id).toBe(buildCatalogProductId(watches[8].title, 8));
    expect(first.querySelector('a').getAttribute('href')).toBe('/p/watches/apple-watch-series-8-45mm-9/');
    expect(first.querySelector('time').dateTime).toBe('2026-10-09');
    expect(first.textContent).toContain('Listed: 9 Oct 2026');
    expect(first.textContent).toContain('15,000');
    expect(document.querySelectorAll('time')).toHaveLength(1);
  });
});
