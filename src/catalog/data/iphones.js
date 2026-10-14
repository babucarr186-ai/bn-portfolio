import { iphones as baseIphones } from './iphones.base.js';

const offerExpiresAt = '2026-10-15T15:40:44.000Z';
const offerActive = Date.now() < Date.parse(offerExpiresAt);
const iphone18PriceLabel = offerActive ? '120,000' : '150,000';
const regularWhatsAppMessage = 'Hi Uncle Apple! Please confirm availability for: iPhone 18 Pro Max - Burgundy, 256GB, brand new in box. Price GMD 150,000. Available in The Gambia.';

const iphone18ProMax = {
  title: 'iPhone 18 Pro Max',
  subtitle: `Burgundy • 256GB • Brand new in box • GMD ${iphone18PriceLabel}`,
  kind: 'phone',
  color: 'Burgundy',
  storage: '256GB',
  condition: 'Brand new in box',
  price: offerActive ? 120000 : 150000,
  originalPrice: offerActive ? 150000 : undefined,
  discountPercent: offerActive ? 20 : undefined,
  offerExpiresAt: offerActive ? offerExpiresAt : undefined,
  regularWhatsAppMessage,
  sold: false,
  availability: 'Available',
  whatsAppMessage:
    regularWhatsAppMessage.replace('150,000', iphone18PriceLabel),
  shortDescription:
    'Brand new iPhone 18 Pro Max in Burgundy with 256GB storage, new in the box.',
  description:
    `Brand new iPhone 18 Pro Max in Burgundy with 256GB storage. Comes new in the box and is available now from Uncle Apple Store. Price GMD ${iphone18PriceLabel}.`,
  productTitle: 'iPhone 18 Pro Max (256GB) - Burgundy - Brand new in box',
  productHighlights: [
    '256GB storage',
    'Burgundy finish',
    'Brand new in box',
    'Available now',
  ],
  conditionReport: [
    'Brand new condition',
    'Comes in the box',
  ],
  images: [
    'products/iphones/iphone-18-pro-max-256gb-burgundy/IMG_3004.jpeg',
  ],
  mediaFit: 'contain',
};

const targetIndex = baseIphones.findIndex((product) =>
  product?.title === 'iPhone 12 Pro Max' &&
  product?.storage === '128GB' &&
  product?.batteryHealth === '84%'
);

const target = targetIndex >= 0 ? baseIphones[targetIndex] : null;

const updatedTarget = target
  ? {
      ...target,
      subtitle: '128GB • Grade A • Battery 84% • Germany sourced • GMD 26,000',
      condition: 'Used - Grade A',
      availability: 'Available',
      sold: false,
      price: 26000,
      whatsAppMessage:
        'Hi Uncle Apple! Please confirm availability for: iPhone 12 Pro Max - 128GB, Grade A condition, battery 84%, sourced from Germany, factory unlocked, dual SIM (SIM + eSIM). Price GMD 26,000. In The Gambia.',
      description:
        'iPhone 12 Pro Max with 128GB storage, Grade A condition and 84% battery health. Sourced from Germany, tested, factory unlocked and ready to use. Price GMD 26,000.',
      productTitle: 'iPhone 12 Pro Max (128GB) - Grade A - Battery 84% - Germany sourced',
    }
  : null;

const currentIphones = updatedTarget
  ? [updatedTarget, ...baseIphones.filter((_, index) => index !== targetIndex)]
  : baseIphones;

export const iphones = [iphone18ProMax, ...currentIphones];
