import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';
const script = readFileSync('public/referral.js', 'utf8');
const key = 'ua_referral_v1';
function page(query = '', stored, blocked = false) {
  const dom = new JSDOM('<a id="buy" href="https://wa.me/220833013139?text=iMac%2046000">Buy</a>', { url: 'https://uncleapplestore.com/' + query, runScripts: 'outside-only' });
  if (stored) dom.window.localStorage.setItem(key, JSON.stringify(stored));
  if (blocked) Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('Blocked'); } });
  dom.window.eval(script);
  return dom;
}
const message = dom => new URL(dom.window.document.querySelector('#buy').href).searchParams.get('text');
describe('Teema referral enquiries', () => {
  it('preserves the product enquiry, accepts lowercase, and persists to another page', () => {
    const first = page('?ref=teema');
    expect(message(first)).toBe('iMac 46000\n\nReferral code: TEEMA');
    const saved = JSON.parse(first.window.localStorage.getItem(key));
    const next = page('macbook.html', saved);
    expect(message(next)).toContain('Referral code: TEEMA');
    first.window.close(); next.window.close();
  });
  it('leaves organic, invalid and expired referrals untagged', () => {
    for (const dom of [page(), page('?ref=FAKE'), page('', { code: 'TEEMA', expires: Date.now() - 1 })]) {
      expect(message(dom)).toBe('iMac 46000'); dom.window.close();
    }
  });
  it('updates dynamically inserted links without duplicate codes', async () => {
    const dom = page('?ref=TEEMA');
    const a = dom.window.document.createElement('a');
    a.href = 'https://wa.me/220833013139?text=Cart';
    dom.window.document.body.append(a);
    await new Promise(resolve => setTimeout(resolve, 0));
    const once = a.href;
    expect(dom.window.uaReferral.decorate(once)).toBe(once);
    expect(new URL(once).searchParams.get('text')).toContain('Referral code: TEEMA');
    dom.window.close();
  });
  it('works on the landing page with blocked storage and preserves unrelated URLs', () => {
    const dom = page('?ref=TEEMA', null, true);
    expect(message(dom)).toContain('Referral code: TEEMA');
    for (const href of ['https://example.com', 'https://wa.me/12345', 'https://wa.me.evil.test/220833013139']) expect(dom.window.uaReferral.decorate(href)).toBe(href);
    dom.window.close();
  });
});
