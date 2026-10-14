import { afterEach, describe, expect, it, vi } from 'vitest';
import { startOfferCountdown } from './offerCountdown.js';

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  document.body.innerHTML = '';
});

describe('24-hour iPhone offer', () => {
  it('uses a fixed deadline and restores the regular detail price and enquiry at expiry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T15:40:44Z'));
    document.body.innerHTML = '<article><div class="product-offer-row">GMD 120,000</div><p data-offer-expires="2026-10-15T15:40:44Z" data-regular-price="GMD 150,000" data-regular-message="iPhone 18 Pro Max GMD 150,000"></p></article><a href="https://wa.me/4915679652076?text=iPhone%2018%20Pro%20Max%20GMD%20120%2C000">Enquire</a>';
    startOfferCountdown();
    const timer = document.querySelector('[data-offer-expires]');
    expect(timer.textContent).toContain('24:00:00');
    vi.advanceTimersByTime(1000);
    startOfferCountdown();
    expect(timer.textContent).toContain('23:59:59');
    vi.advanceTimersByTime(86399000);
    expect(timer.textContent).toBe('Offer ended');
    expect(document.querySelector('.product-offer-row').textContent).toBe('GMD 150,000');
    expect(new URL(document.querySelector('a').href).searchParams.get('text')).toContain('150,000');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('loads the sale before expiry and the regular listing after expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T15:40:44Z'));
    const active = (await import('./data/iphones.js')).iphones[0];
    expect(active.price).toBe(120000);
    expect(active.originalPrice).toBe(150000);
    expect(active.discountPercent).toBe(20);
    vi.resetModules();
    vi.setSystemTime(new Date('2026-10-15T15:40:44Z'));
    const ended = (await import('./data/iphones.js')).iphones[0];
    expect(ended.price).toBe(150000);
    expect(ended.offerExpiresAt).toBeUndefined();
    expect(ended.whatsAppMessage).toContain('150,000');
    expect(ended.subtitle).toContain('150,000');
  });
});
