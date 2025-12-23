export const WHATSAPP_NUMBER_E164 = '491743173671';
export const WHATSAPP_GREETING = '👋 Hi Bubacar! I visited your portfolio and would like to know more about...';

export function buildWhatsAppLink(customPrefix = '') {
  const base = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
  const text = encodeURIComponent((customPrefix ? customPrefix + '\n' : '') + WHATSAPP_GREETING);
  return `${base}?text=${text}`;
}