import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { calculateGiftCard, giftCardMessage, initGiftCardOrder } from './giftCardOrder.js';
import { GIFT_CARD_EUR_RATE } from './giftCardConfig.js';
import { giftCards } from './catalog/data/giftcards.js';
import { WHATSAPP_NUMBER_E164 } from './contactConfig.js';

vi.mock('./site.js', async () => {
  const { WHATSAPP_NUMBER_E164 } = await import('./contactConfig.js');
  return { buildWhatsAppLink: (message) => `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent(message)}` };
});
const rateOverride = vi.hoisted(() => ({ value: null }));
vi.mock('./giftCardConfig.js', async (importOriginal) => {
  const original = await importOriginal();
  return { get GIFT_CARD_EUR_RATE() { return rateOverride.value ?? original.GIFT_CARD_EUR_RATE; } };
});
const page = readFileSync(new NodeURL('../gift-cards.html', import.meta.url), 'utf8');
const click = (selector) => document.querySelector(selector).click();
const text = (selector) => document.querySelector(selector).textContent;
function enter(value) {
  const input = document.querySelector('[name="customAmount"]');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('gift card calculation', () => {
  it.each([[10, 1, 920], [25, 2, 4600], [100, 1, 9200], [100, 3, 27600], [75, 2, 13800]])('calculates €%s × %s', (value, quantity, price) => {
    expect(calculateGiftCard(value, quantity)).toEqual({ value, quantity, total: value * quantity, price });
    expect(price).toBe(value * quantity * GIFT_CARD_EUR_RATE);
  });
  it.each(['', '0', '-1', 'abc', 'NaN', 'Infinity', '1e5', '1.234', '99999999999999999999'])('rejects invalid amount %s', (value) => {
    expect(calculateGiftCard(value, 1)).toBeNull();
  });
  it.each([0, -1, 1.5, Infinity, NaN])('rejects invalid quantity %s', (quantity) => {
    expect(calculateGiftCard(10, quantity)).toBeNull();
  });
  it('calculates decimal amounts without floating point artifacts', () => {
    expect(calculateGiftCard('10.10', 3)).toEqual({ value: 10.1, quantity: 3, total: 30.3, price: 2788 });
  });
});

describe('gift card form', () => {
  beforeEach(() => {
    document.body.innerHTML = page.match(/<form class="gift-card-order"[\s\S]*?<\/form>/)[0];
    initGiftCardOrder(document.getElementById('giftCardOrder'));
  });
  it('loads supported type and initial estimate', () => {
    expect(text('[name="giftCardType"]')).toBe('Apple Gift Card');
    expect(document.querySelector('[data-type-selector]').hidden).toBe(true);
    expect(text('[data-single-type]')).toBe('Apple Gift Card');
    expect(document.querySelector('[data-single-type]').hidden).toBe(false);
    expect(text('[data-price]')).toBe('GMD 920');
    expect(document.querySelector('[data-decrease]').disabled).toBe(true);
  });
  it('updates quantity and preset selections', () => {
    click('[data-amount="25"]'); click('[data-increase]');
    expect(text('[data-total]')).toBe('€50');
    expect(text('[data-price]')).toBe('GMD 4,600');
    click('[data-amount="100"]'); click('[data-increase]');
    expect(text('[data-price]')).toBe('GMD 27,600');
    click('[data-decrease]');
    expect(text('[data-price]')).toBe('GMD 18,400');
  });
  it('switches custom and preset values without stale totals', () => {
    click('[data-amount="custom"]');
    expect(document.querySelector('[type="submit"]').disabled).toBe(true);
    enter('75'); click('[data-increase]');
    expect(text('[data-total]')).toBe('€150');
    expect(text('[data-price]')).toBe('GMD 13,800');
    click('[data-amount="10"]');
    expect(text('[data-price]')).toBe('GMD 1,840');
    expect(document.querySelector('[data-custom]').hidden).toBe(true);
    expect(document.querySelector('[data-amount="10"]').getAttribute('aria-pressed')).toBe('true');
    click('[data-amount="custom"]');
    expect(text('[data-price]')).toBe('GMD 13,800');
  });
  it.each(['', '0', '-2', 'abc', '1.234', '1e99'])('blocks invalid custom input %s', (value) => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    click('[data-amount="custom"]'); enter(value);
    expect(document.querySelector('[type="submit"]').disabled).toBe(true);
    expect(text('[data-price]')).toBe('—');
    expect(text('[data-error]')).toContain('greater than zero');
    document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(open).not.toHaveBeenCalled(); open.mockRestore();
  });
  it('generates the complete WhatsApp request for the existing number', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    click('[data-amount="100"]'); click('[data-increase]');
    click('[type="submit"]');
    const url = new URL(open.mock.calls[0][0]);
    expect(url.pathname).toBe(`/${WHATSAPP_NUMBER_E164}`);
    expect(url.searchParams.get('text')).toBe('Hello Uncle Apple Store,\n\nI would like to request an Apple Gift Card.\n\nValue: €100\nQuantity: 2\nTotal gift card value: €200\nEstimated price: GMD 18,400\n\nPlease confirm the current price and availability.');
    expect(giftCardMessage('Apple Gift Card', calculateGiftCard(100, 2))).toBe(url.searchParams.get('text'));
    open.mockRestore();
  });
});


describe('single selling rate configuration', () => {
  it.each([87.5, 95, 100])('updates every preset, custom amount, quantity and WhatsApp estimate at rate %s', (rate) => {
    rateOverride.value = rate;
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      document.body.innerHTML = page.match(/<form class="gift-card-order"[\s\S]*?<\/form>/)[0];
      initGiftCardOrder(document.getElementById('giftCardOrder'));
      const formatted = (amount) => `GMD ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
      for (const amount of [10, 25, 50, 100, 200]) {
        click(`[data-amount="${amount}"]`);
        expect(text('[data-price]')).toBe(formatted(amount * rate));
      }
      click('[data-increase]'); click('[data-increase]');
      for (const amount of [10, 25, 50, 100, 200]) {
        click(`[data-amount="${amount}"]`);
        expect(text('[data-price]')).toBe(formatted(amount * 3 * rate));
        click('[type="submit"]');
        expect(new URL(open.mock.calls.at(-1)[0]).searchParams.get('text')).toContain(`Estimated price: ${formatted(amount * 3 * rate)}\n`);
      }
      click('[data-amount="custom"]'); enter('75.25');
      click('[data-decrease]');
      expect(text('[data-total]')).toBe('€150.5');
      expect(calculateGiftCard('75.25', 2).price).toBe(Math.round(150.5 * rate));
      expect(text('[data-price]')).toBe(formatted(150.5 * rate));
      click('[type="submit"]');
      expect(new URL(open.mock.calls.at(-1)[0]).searchParams.get('text')).toContain(`Estimated price: ${formatted(150.5 * rate)}\n`);
    } finally {
      rateOverride.value = null;
      open.mockRestore();
    }
  });
});


describe('multiple active types', () => {
  it('keeps the selector available when the catalog has multiple active products', () => {
    giftCards.push({ title: 'Test catalog product' });
    try {
      document.body.innerHTML = page.match(/<form class="gift-card-order"[\s\S]*?<\/form>/)[0];
      initGiftCardOrder(document.getElementById('giftCardOrder'));
      expect(document.querySelector('[data-type-selector]').hidden).toBe(false);
      expect(document.querySelector('[data-single-type]').hidden).toBe(true);
      expect(document.querySelector('[name="giftCardType"]').options.length).toBe(2);
    } finally {
      giftCards.pop();
    }
  });
});
