import { describe, expect, it } from 'vitest';

import { buildCatalogCardSummary } from './renderCatalog.js';

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