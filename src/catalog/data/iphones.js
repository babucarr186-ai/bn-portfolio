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

const iphoneXRBlackOptions = {
  title: 'iPhone XR',
  productTitle: 'iPhone XR - Black - 64GB or 128GB - Used',
  subtitle: 'Black • Used • 64GB / Battery 87%: GMD 10,000 • 128GB / Battery 89%: GMD 12,000',
  kind: 'phone',
  color: 'Black',
  storage: '64GB / 128GB',
  batteryHealth: '87% / 89%',
  condition: 'Used',
  price: 10000,
  sold: false,
  availability: 'Available',
  listingDate: '2026-10-21',
  shortDescription: 'Choose 64GB with 87% battery for GMD 10,000 or 128GB with 89% battery for GMD 12,000. Both are used. Product photos are shared between the two options; the battery and storage screenshots show the 64GB device.',
  description: 'Used black iPhone XR. Select 64GB with 87% battery health at GMD 10,000, or 128GB with 89% battery health at GMD 12,000. Shared product photos; screenshots show the 64GB model with 87% battery.',
  whatsAppMessage: 'Hi Uncle Apple! I am interested in the used black iPhone XR, 64GB, battery 87%, GMD 10,000.',
  variants: [
    { storage: '64GB', batteryHealth: '87%', price: 10000 },
    { storage: '128GB', batteryHealth: '89%', price: 12000 },
  ],
  images: [
    'products/iphones/iphone-xr-black-options/iphone-xr-back.jpeg',
    'products/iphones/iphone-xr-black-options/iphone-xr-front.jpeg',
    'products/iphones/iphone-xr-black-options/iphone-xr-box.jpeg',
    'products/iphones/iphone-xr-black-options/iphone-xr-accessories.jpeg',
    'products/iphones/iphone-xr-black-options/iphone-xr-battery-64gb.jpeg',
    'products/iphones/iphone-xr-black-options/iphone-xr-info-64gb.jpeg',
  ],
  mediaFit: 'contain',
};

const iphoneDuoNightSky = {
  title: 'iPhone Duo',
  productTitle: 'iPhone Duo (512GB) - Night Sky',
  subtitle: '512GB • Night Sky • Available now • No pre-order • Free original Apple case • Price on request',
  kind: 'phone',
  color: 'Night Sky',
  storage: '512GB',
  sold: false,
  availability: 'Available now - No pre-order',
  listingDate: '2026-10-22',
  networkStatus: 'Confirm network compatibility on WhatsApp',
  shortDescription: 'Available now, no pre-order. iPhone Duo with 512GB storage in Night Sky, including a free original Apple case in your choice of colour. Request the price on WhatsApp.',
  description: 'iPhone Duo with 512GB storage in Night Sky. Available to buy now, with no pre-order required. Includes a free original Apple case in your choice of colour. Request the price and your preferred case colour on WhatsApp.',
  longDescription: 'iPhone Duo with 512GB storage in Night Sky. Available to buy now, with no pre-order required. Includes a free original Apple case in your choice of colour. Request the price and your preferred case colour on WhatsApp.',
  whatsAppMessage: 'Hi Uncle Apple! Please share the price of the iPhone Duo, 512GB, Night Sky, available now with no pre-order. I would also like to choose the colour of the free original Apple case.',
  ctaPrimaryLabel: 'Request price on WhatsApp',
  catalogWhatsAppLabel: 'Request price on WhatsApp',
  ctaTitle: 'Available now - No pre-order',
  ctaText: 'Request the price on WhatsApp and tell us your preferred colour for the free original Apple case.',
  productHighlights: ['512GB storage', 'Night Sky finish', 'Available now - no pre-order', 'Free original Apple case', 'Choice of case colour', 'Price on request via WhatsApp'],
  images: [
    'products/iphones/iphone-duo-512gb-night-sky/iphone-duo-night-sky.jpeg',
    'products/iphones/iphone-duo-512gb-night-sky/iphone-duo-case-burgundy.jpeg',
    'products/iphones/iphone-duo-512gb-night-sky/iphone-duo-case-dark.jpeg',
    'products/iphones/iphone-duo-512gb-night-sky/iphone-duo-flyer.jpg',
  ],
  mediaFit: 'contain',
};

// Append listings: existing product URLs include their array index.
export const iphones = [iphoneSE2022ProductRed, iphone18ProMax, ...currentIphones, iphone11Green, iphoneXRBlackOptions, iphoneDuoNightSky];
