const base = import.meta.env.BASE_URL;

export const storefrontHeroSlides = [
  {
    id: 'welcome-to-uncle-apple-store',
    eyebrow: 'Uncle Apple Store',
    title: 'Welcome to Uncle Apple Store',
    subtitle: 'Your Trusted Apple Partner In The Gambia',
    ctaLabel: 'WhatsApp Us',
    whatsappMessage: 'Hi Uncle Apple Store! I would like to speak with your team about available Apple devices in The Gambia.',
    image: {
      src: `${base}hero-slider/welcome-store.jpeg`,
      alt: 'Warm and modern Uncle Apple Store interior with Apple products and support staff',
    },
    imagePosition: 'center center',
    mobileImagePosition: '69% center',
    highlights: ['Trusted Apple partner', 'Professional support', 'Store experience'],
  },
  {
    id: 'experience-apple-differently',
    eyebrow: 'Premium Apple experience',
    title: 'Experience Apple Differently',
    subtitle: 'Honest Devices • Honest Prices • Trusted Service',
    ctaLabel: 'View Collection',
    href: './models/',
    image: {
      src: `${base}hero-slider/experience-storefront.jpeg`,
      alt: 'Inside Uncle Apple Store with premium Apple displays and a customer service experience',
    },
    imagePosition: 'center center',
    mobileImagePosition: '66% center',
    highlights: ['Honest devices', 'Honest prices', 'Trusted service'],
  },
  {
    id: 'latest-iphones-available',
    eyebrow: 'New arrivals',
    title: 'Latest iPhones Available',
    subtitle: 'Premium Technology For Everyday Life',
    ctaLabel: 'Shop iPhones',
    href: '#inventory',
    image: {
      src: `${base}hero-slider/latest-iphones.jpeg`,
      alt: 'Uncle Apple Store showroom with latest iPhone display and in-store product selection',
    },
    imagePosition: 'center center',
    mobileImagePosition: '65% center',
    highlights: ['Latest iPhones', 'Premium technology', 'Everyday reliability'],
  },
  {
    id: 'apple-watch-collection',
    eyebrow: 'Wearables collection',
    title: 'Apple Watch Collection',
    subtitle: 'Stay Connected • Stay Healthy • Stay Ahead',
    ctaLabel: 'View Apple Watches',
    href: './apple-watch.html',
    image: {
      src: `${base}hero-slider/apple-watch.jpeg`,
      alt: 'Apple Watch Series 7 product hero image with pricing and feature highlights',
    },
    imagePosition: '74% center',
    mobileImagePosition: '78% center',
    highlights: ['Health tracking', 'Always connected', 'Germany quality'],
  },
];