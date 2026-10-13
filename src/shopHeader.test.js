import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const script = readFileSync('public/sticky-category-nav.js', 'utf8');

describe('Shop sticky header', () => {
  beforeEach(() => {
    document.documentElement.dataset.category = 'models';
    document.body.innerHTML = '<header class="nav"><a class="logo">Logo</a><nav class="nav-links--catbar">Categories</nav></header>';
    window.matchMedia = vi.fn(() => ({ matches: true }));
    document.querySelector('.nav').getBoundingClientRect = () => ({ top: 0 });
    document.querySelector('nav').getBoundingClientRect = () => ({ top: 72 });
  });

  it('uses a measured sticky offset instead of hiding the logo on scroll', () => {
    const listener = vi.spyOn(window, 'addEventListener');
    window.eval(script);
    expect(document.querySelector('.nav').style.getPropertyValue('--shop-nav-top')).toBe('-68px');
    expect(listener.mock.calls.some(([event]) => event === 'scroll')).toBe(false);
    expect(document.querySelector('.nav').classList.contains('is-category-sticky')).toBe(false);
    listener.mockRestore();
  });

  it('leaves the desktop header pinned at the top', () => {
    window.matchMedia = vi.fn(() => ({ matches: false }));
    window.eval(script);
    expect(document.querySelector('.nav').style.getPropertyValue('--shop-nav-top')).toBe('0px');
  });

  it('does nothing without a category header', () => {
    document.body.innerHTML = '';
    expect(() => window.eval(script)).not.toThrow();
  });

  it('preserves the existing threshold behaviour on other pages', () => {
    document.documentElement.dataset.category = 'iphones';
    vi.stubGlobal('scrollY', 120);
    window.eval(script);
    expect(document.querySelector('.nav').classList.contains('is-category-sticky')).toBe(true);
    vi.unstubAllGlobals();
  });
});
