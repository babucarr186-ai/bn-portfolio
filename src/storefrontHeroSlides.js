const base = import.meta.env.BASE_URL;

export const storefrontHeroSlides = [
  {
    id: 'iphone-17-air',
    eyebrow: 'Silver',
    title: 'Meet iPhone 17 Air',
    subtitle: 'Thin. Light. Ready for everyday.',
    ctaLabel: 'Shop Now',
    href: '#inventory',
    image: {
      src: `${base}products/iphones/iphone-14-white-128gb/iphone-14-white-128gb-1-1200.jpg`,
      alt: 'Light-finish iPhone with packaging arranged on a clean white surface',
    },
    theme: 'silver',
  },
  {
    id: 'iphone-16-plus',
    eyebrow: 'Pink',
    title: 'iPhone 16 Plus',
    subtitle: 'Big display. Beautiful pink finish.',
    ctaLabel: 'View Collection',
    href: '#inventory',
    image: {
      src: `${base}products/iphones/iphone-13-pink-128gb/iphone-13-pink-128gb-1-1200.jpg`,
      alt: 'Pink iPhone with box and accessory case on a soft white background',
    },
    theme: 'pink',
  },
  {
    id: 'iphone-17-pro-max',
    eyebrow: 'Silver',
    title: 'iPhone 17 Pro Max',
    subtitle: 'Built for people who want the best.',
    ctaLabel: 'Explore',
    href: '#inventory',
    image: {
      src: `${base}products/iphones/iphone-17-pro-max-cosmic-orange-256gb/iphone 17-pro-max-1200.jpg`,
      alt: 'Pro iPhone packaging photographed on a bright white surface',
    },
    theme: 'graphite',
  },
  {
    id: 'iphone-15-plus',
    eyebrow: 'Pink',
    title: 'iPhone 15 Plus',
    subtitle: 'Reliable. Beautiful. Ready to use.',
    ctaLabel: 'Shop Now',
    href: '#inventory',
    image: {
      src: `${base}products/iphones/iphone-13-pink-128gb/iphone-13-pink-128gb-4-1200.jpg`,
      alt: 'Pink iPhone front view inside its box on a clean white surface',
    },
    theme: 'rose',
  },
  {
    id: 'iphone-14-pro-max',
    eyebrow: 'Deep Purple',
    title: 'iPhone 14 Pro Max',
    subtitle: 'A customer favourite.',
    ctaLabel: 'View Details',
    href: './p/iphones/iphone-14-pro-max-128gb-premium-finish-ready-to-use-29/',
    image: {
      src: `${base}products/iphones/iphone-14-pro-max-128gb/iphone-14-pro-max-128gb-2-1200.jpg`,
      alt: 'iPhone 14 Pro Max packaging and accessories arranged on a bright white surface',
    },
    theme: 'purple',
  },
];