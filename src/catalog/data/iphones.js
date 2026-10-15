import { iphones as baseIphones } from './iphones.base.js';

const iphone18ProMax = {
  title: 'iPhone 18 Pro Max',
  subtitle: 'Burgundy • 256GB • Brand new in box • Only available on order',
  kind: 'phone',
  color: 'Burgundy',
  storage: '256GB',
  condition: 'Brand new in box',
  price: 150000,
  sold: true,
  stockRemaining: 0,
  availability: 'Only available on order',
  whatsAppMessage:
    'Hi Uncle Apple! I would like to order an iPhone 18 Pro Max - Burgundy, 256GB, brand new in box. Please confirm the current order price and delivery time.',
  shortDescription: 'Only available on order',
  description: 'Only available on order',
  ctaText: 'Only available on order',
  productTitle: 'iPhone 18 Pro Max (256GB) - Burgundy - Brand new in box',
  productHighlights: [
    '256GB storage',
    'Burgundy finish',
    'Brand new in box',
    'Only available on order',
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
