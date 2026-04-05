import { describe, expect, it } from 'vitest';

import { buildSchemaDescription, cleanDescriptionText } from './generate-seo-snippets.mjs';

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
});