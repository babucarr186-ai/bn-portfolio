const base = import.meta.env.BASE_URL;

export const storefrontHeroSlides = [
  {
    id: 'apple-watch-ultra',
    eyebrow: 'Built for adventure',
    title: 'Apple Watch Ultra',
    subtitle: 'Strong, capable and ready for every day.',
    ctaLabel: 'Shop Apple Watch',
    href: './apple-watch.html',
    image: {
      src: `${base}hero/apple-watch-ultra.webp`,
      alt: 'Apple Watch Ultra with dark trail loop',
    },
    theme: 'warm',
    fit: 'contain',
  },
  {
    id: 'uncle-apple-store',
    eyebrow: 'The Gambia',
    title: 'Uncle Apple Store',
    subtitle: 'Original Apple devices, sourced with care.',
    ctaLabel: 'View Products',
    href: '#inventory',
    image: {
      src: `${base}hero/uncle-apple-store.webp`,
      alt: 'Uncle Apple Store showroom in The Gambia',
    },
    theme: 'photo',
    fit: 'cover',
  },
  {
    id: 'carefully-sourced',
    eyebrow: 'Sourced in Germany',
    title: 'Carefully picked',
    subtitle: 'We personally inspect devices before they reach The Gambia.',
    ctaLabel: 'Why Choose Us',
    href: './about/',
    image: {
      src: `${base}hero/carefully-sourced.webp`,
      alt: 'Uncle Apple Store carefully inspecting Apple products at a German electronics dealer',
    },
    theme: 'photo',
    fit: 'cover',
  },
  {
    id: 'iphone-16-purple',
    eyebrow: 'New colour',
    title: 'iPhone 16 Purple',
    subtitle: 'Beautiful colour. Powerful everyday performance.',
    ctaLabel: 'Shop iPhones',
    href: '#inventory',
    image: {
      src: `${base}hero/iphone-16-purple.webp`,
      alt: 'Purple iPhone 16 viewed from the back',
    },
    theme: 'purple',
    fit: 'contain',
  },
];
