export const WHATSAPP_NUMBER_E164 = '4915679652076';
export const WHATSAPP_GREETING = 'Hi! I want to request iPhone availability. Please share what\'s in stock and delivery/pickup options.';

export function buildWhatsAppLink(customPrefix = '') {
  const base = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
  const text = encodeURIComponent((customPrefix ? customPrefix + '\n' : '') + WHATSAPP_GREETING);
  return `${base}?text=${text}`;
}