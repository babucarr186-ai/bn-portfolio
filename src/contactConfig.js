export const WHATSAPP_NUMBER_E164 = '220833013139';
export const WHATSAPP_DISPLAY = '+220 83 301 3139';
export const GERMANY_WHATSAPP_NUMBER_E164 = '4915679652076';
export const GERMANY_WHATSAPP_DISPLAY = '+49 1567 9652076';
export const WHATSAPP_GREETING = 'Hi! I want to request iPhone availability. Please share what\'s in stock and delivery/pickup options.';

export function buildWhatsAppLink(customPrefix = '') {
  const base = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
  const text = encodeURIComponent((customPrefix ? customPrefix + '\n' : '') + WHATSAPP_GREETING);
  return `${base}?text=${text}`;
}
