import { GIFT_CARD_EUR_RATE } from './giftCardConfig.js';
import { giftCards } from './catalog/data/giftcards.js';
import { buildWhatsAppLink } from './site.js';
import './giftCardOrder.css';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const eur = (value) => `€${number.format(value)}`;
const dalasi = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const gmd = (value) => `GMD ${dalasi.format(value)}`;

export function calculateGiftCard(value, quantity) {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  const cents = Math.round(amount * 100);
  const totalCents = cents * quantity;
  const price = Math.round((totalCents / 100) * GIFT_CARD_EUR_RATE);
  if (amount <= 0 || !Number.isSafeInteger(cents) || !Number.isSafeInteger(quantity) || quantity < 1
    || !Number.isSafeInteger(totalCents) || !Number.isSafeInteger(price)
    || !Number.isFinite(GIFT_CARD_EUR_RATE) || GIFT_CARD_EUR_RATE <= 0) return null;
  return { value: amount, quantity, total: totalCents / 100, price };
}

export function giftCardMessage(type, order) {
  return `Hello Uncle Apple Store,\n\nI would like to request an ${type}.\n\nValue: ${eur(order.value)}\nQuantity: ${order.quantity}\nTotal gift card value: ${eur(order.total)}\nEstimated price: ${gmd(order.price)}\n\nPlease confirm the current price and availability.`;
}

export function initGiftCardOrder(form) {
  if (!form) return;
  const type = form.querySelector('[name="giftCardType"]');
  const availableTypes = giftCards.filter((product) => !product.sold);
  availableTypes.forEach((product) => {
    const option = document.createElement('option');
    option.value = product.title;
    option.textContent = product.title;
    type.append(option);
  });
  const singleType = form.querySelector('[data-single-type]');
  if (singleType && availableTypes.length === 1) {
    singleType.textContent = availableTypes[0].title;
    singleType.hidden = false;
    form.querySelector('[data-type-selector]').hidden = true;
  }
  const custom = form.querySelector('[name="customAmount"]');
  const customWrap = form.querySelector('[data-custom]');
  const error = form.querySelector('[data-error]');
  const quantityLabel = form.querySelector('[data-quantity]');
  const decrease = form.querySelector('[data-decrease]');
  const increase = form.querySelector('[data-increase]');
  const submit = form.querySelector('[type="submit"]');
  let selected = '10';
  let quantity = 1;

  function update() {
    const order = calculateGiftCard(selected === 'custom' ? custom.value : selected, quantity);
    const valid = !!order && !!type.value;
    customWrap.hidden = selected !== 'custom';
    custom.disabled = selected !== 'custom';
    custom.required = selected === 'custom';
    custom.setAttribute('aria-invalid', String(selected === 'custom' && !order));
    error.textContent = !type.value ? 'Please contact us to confirm gift card availability.'
      : selected === 'custom' && !order ? 'Enter a EUR amount greater than zero, with up to two decimal places.' : '';
    quantityLabel.textContent = quantity;
    decrease.disabled = quantity === 1;
    increase.disabled = !calculateGiftCard(selected === 'custom' ? custom.value : selected, quantity + 1);
    form.querySelector('[data-total]').textContent = order ? eur(order.total) : '—';
    form.querySelector('[data-price]').textContent = order ? gmd(order.price) : '—';
    submit.disabled = !valid;
    return valid ? order : null;
  }
  form.querySelectorAll('[data-amount]').forEach((button) => {
    button.addEventListener('click', () => {
      selected = button.dataset.amount;
      form.querySelectorAll('[data-amount]').forEach((item) => {
        item.setAttribute('aria-pressed', String(item === button));
      });
      update();
      if (selected === 'custom') custom.focus();
    });
  });
  custom.addEventListener('input', update);
  type.addEventListener('change', update);
  decrease.addEventListener('click', () => { quantity = Math.max(1, quantity - 1); update(); });
  increase.addEventListener('click', () => {
    if (calculateGiftCard(selected === 'custom' ? custom.value : selected, quantity + 1)) quantity += 1;
    update();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const order = update();
    if (!order || !form.reportValidity()) return;
    window.open(buildWhatsAppLink(giftCardMessage(type.value, order)), '_blank', 'noopener,noreferrer');
  });
  update();
}

initGiftCardOrder(document.getElementById('giftCardOrder'));
