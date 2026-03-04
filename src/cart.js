const CART_STORAGE_KEY = 'uncle_apple_cart_v1';

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeCartItem(input) {
  const id = String(input?.id || '').trim();
  const name = String(input?.name || '').trim();
  const storage = String(input?.storage || '').trim();
  const image = String(input?.image || '').trim();

  const price = isFiniteNumber(input?.price) ? input.price : 0;
  const quantityRaw = Number(input?.quantity);
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;

  return {
    id: id || `${name || 'item'}-${storage || 'default'}`,
    name: name || 'Product',
    storage,
    image,
    price,
    quantity,
  };
}

export function loadCart() {
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  const parsed = safeParse(raw, null);

  if (!parsed || typeof parsed !== 'object') return { items: [] };

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return {
    items: items.map(normalizeCartItem),
  };
}

export function saveCart(cart) {
  const items = Array.isArray(cart?.items) ? cart.items.map(normalizeCartItem) : [];
  const normalized = { items };
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('cart:changed', { detail: normalized }));
  return normalized;
}

export function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  const empty = { items: [] };
  window.dispatchEvent(new CustomEvent('cart:changed', { detail: empty }));
  return empty;
}

export function addToCart(item) {
  const cart = loadCart();
  const next = normalizeCartItem(item);

  const existingIndex = cart.items.findIndex((x) => x.id === next.id);
  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += next.quantity;
  } else {
    cart.items.push(next);
  }

  return saveCart(cart);
}

export function removeFromCart(id) {
  const cart = loadCart();
  const target = String(id || '').trim();
  cart.items = cart.items.filter((x) => x.id !== target);
  return saveCart(cart);
}

export function updateQuantity(id, quantity) {
  const cart = loadCart();
  const target = String(id || '').trim();
  const q = Math.max(1, Math.floor(Number(quantity) || 1));

  const item = cart.items.find((x) => x.id === target);
  if (!item) return cart;

  item.quantity = q;
  return saveCart(cart);
}

export function cartItemCount(cart) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

export function cartSubtotal(cart) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
}

export function formatMoney(amount, options = {}) {
  const currency = options.currency || 'GMD';
  const locale = options.locale || 'en-GM';
  const value = Number(amount) || 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export function buildOrderMessage({ cart, customer, storeName = 'Uncle Apple Store', currency = 'GMD' }) {
  const items = Array.isArray(cart?.items) ? cart.items : [];

  const productsBlock = items.length
    ? items
        .map((item) => {
          const name = `${item.name}${item.storage ? ` (${item.storage})` : ''}`;
          const pricePart = item.price ? ` — ${formatMoney(item.price, { currency })}` : '';
          return `- ${name} x${item.quantity}${pricePart}`;
        })
        .join('\n')
    : '- (Cart is empty)';

  const total = cartSubtotal({ items });
  const totalLine = `Total: ${formatMoney(total, { currency })}`;

  const name = String(customer?.fullName || '').trim();
  const phone = String(customer?.phone || '').trim();
  const address = String(customer?.address || '').trim();
  const city = String(customer?.city || '').trim();

  return (
    `Hello ${storeName},\n\n` +
    `I placed an order on your website.\n\n` +
    `Products:\n${productsBlock}\n\n` +
    `${totalLine}\n\n` +
    `Name: ${name}\n` +
    `Phone: ${phone}\n` +
    `Address: ${address}${city ? `, ${city}` : ''}\n\n` +
    `I will complete payment via bank transfer (Trust Bank Ltd).`
  );
}
