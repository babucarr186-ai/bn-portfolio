import { iphones as baseIphones } from './iphones.base.js';

const iphoneSE2022ProductRed = {
  title: 'iPhone SE (2022)',
  subtitle: 'PRODUCT(RED) • 64GB • Clean used • Battery 91% • Charging cable included • No box • GMD 12,000',
  kind: 'phone',
  color: 'PRODUCT(RED)',
  storage: '64GB',
  condition: 'Used - Clean',
  batteryHealth: '91%',
  price: 12000,
  sold: false,
  availability: 'Available',
  listingDate: '2026-10-21',
  whatsAppMessage:
    'Hi Uncle Apple! Please confirm availability for: iPhone SE (2022) - PRODUCT(RED), 64GB, clean used condition, battery health 91%, charging cable included, no box. Price GMD 12,000.',
  shortDescription:
    'Clean used iPhone SE (2022) in PRODUCT(RED) with 64GB storage, 91% battery health and a charging cable.',
  description:
    'iPhone SE (2022) in PRODUCT(RED) with 64GB storage and 91% battery health. Clean used condition with light signs of previous use visible in the supplied photos. A charging cable is included; no box. Price GMD 12,000.',
  productTitle: 'iPhone SE (2022) (64GB) - PRODUCT(RED) - Clean used - Battery 91%',
  productHighlights: [
    '64GB storage',
    'PRODUCT(RED) finish',
    '91% battery health',
    'Clean used condition',
    'Charging cable included',
    'No box',
  ],
  conditionReport: [
    'Used - Clean',
    'Battery health: 91%',
    'Light signs of previous use visible in the photos',
    'Charging cable included',
    'No box',
  ],
  images: [
    'products/iphones/iphone-se-2022-product-red-64gb/iphone-se-2022-product-red-back.jpeg',
    'products/iphones/iphone-se-2022-product-red-64gb/iphone-se-2022-product-red-angle.jpeg',
    'products/iphones/iphone-se-2022-product-red-64gb/iphone-se-2022-product-red-camera.jpeg',
    'products/iphones/iphone-se-2022-product-red-64gb/iphone-se-2022-product-red-battery.jpeg',
    'products/iphones/iphone-se-2022-product-red-64gb/iphone-se-2022-product-red-detail.jpeg',
  ],
  mediaFit: 'contain',
  mediaPad: 10,
};

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

const iphone11Green = {
  title: 'iPhone 11',
  subtitle: 'Green • 64GB • Grade A • Battery 84% • Box, charger and Lightning EarPods • GMD 13,500',
  kind: 'phone',
  color: 'Green',
  storage: '64GB',
  condition: 'Used - Grade A',
  batteryHealth: '84%',
  price: 13500,
  sold: false,
  availability: 'Available',
  listingDate: '2026-10-20',
  whatsAppMessage: 'Hi Uncle Apple! Please confirm availability for: iPhone 11 - Green, 64GB, Grade A used condition, battery health 84%. Includes box, charger and wired EarPods with Lightning connector. Price GMD 13,500.',
  shortDescription: 'Grade A used iPhone 11 in Green with 64GB storage and 84% battery health. Includes box, charger and wired Lightning EarPods.',
  description: 'iPhone 11 in Green with 64GB storage and 84% battery health. Grade A used condition, clean and well cared for. Includes box, charger and wired EarPods with Lightning connector. Price GMD 13,500.',
  productTitle: 'iPhone 11 (64GB) - Green - Grade A - Battery 84%',
  productHighlights: ['64GB storage', 'Green finish', 'Grade A used condition', '84% battery health', 'Box and charger included', 'Wired EarPods with Lightning connector included'],
  conditionReport: ['Used - Grade A', 'Clean and well cared for', 'Battery health: 84%'],
  images: [
    'products/iphones/iphone-11-green-64gb/iphone-11-green-front.jpeg',
    'products/iphones/iphone-11-green-64gb/iphone-11-green-back.jpeg',
    'products/iphones/iphone-11-green-64gb/iphone-11-green-accessories.jpeg',
  ],
  mediaFit: 'contain',
};

export const iphones = [iphoneSE2022ProductRed, iphone18ProMax, ...currentIphones, iphone11Green];
