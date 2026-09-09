import { iphones as baseIphones } from './iphones.base.js';

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

export const iphones = updatedTarget
  ? [updatedTarget, ...baseIphones.filter((_, index) => index !== targetIndex)]
  : baseIphones;
