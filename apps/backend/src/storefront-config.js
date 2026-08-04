const DEFAULT_NAVIGATION = [
  { label: 'New', href: '/collections/new', isVisible: true },
  { label: 'Audio', href: '/collections/audio', isVisible: true },
  { label: 'Charging', href: '/collections/charging', isVisible: true },
  { label: 'Cables', href: '/collections/cables', isVisible: true },
  { label: 'Power', href: '/collections/power', isVisible: true },
  { label: 'Accessories', href: '/collections/accessories', isVisible: true },
];

const DEFAULT_HOMEPAGE = {
  hero: {
    eyebrow: 'Everyday audio / power / connection',
    heading: 'Better sound.\nCleaner connections.',
    body: '',
    ctaLabel: 'Discover new tech',
    ctaUrl: '/collections/new',
    imageUrl: '',
    visualType: 'EARBUDS_ANIMATION',
  },
  productSections: [
    { title: 'New arrivals', collectionSlug: 'new', limit: 4 },
    { title: 'Everyday upgrades', collectionSlug: 'all', limit: 4 },
  ],
  editorialPanels: [
    {
      eyebrow: 'Audio',
      heading: 'Sound, reduced to what matters.',
      ctaLabel: 'Explore audio',
      ctaUrl: '/collections/audio',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1500&q=90',
    },
    {
      eyebrow: 'Charging',
      heading: 'Power, cleanly considered.',
      ctaLabel: 'Explore charging',
      ctaUrl: '/collections/charging',
      imageUrl: 'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?auto=format&fit=crop&w=1500&q=90',
    },
  ],
  statement: {
    eyebrow: 'Our perspective',
    heading: 'Technology should feel useful beyond the unboxing—simple enough to live with, reliable enough to reach for every day.',
    ctaLabel: 'Read our approach',
    ctaUrl: '/pages/about',
  },
  mosaic: [
    { label: 'Earbuds', href: '/collections/earbuds', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=90' },
    { label: 'Cables', href: '/collections/cables', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=90' },
    { label: 'Accessories', href: '/collections/accessories', imageUrl: 'https://images.unsplash.com/photo-1622445275576-721325763afe?auto=format&fit=crop&w=1200&q=90' },
  ],
};

const DEFAULT_FOOTER = {
  newsletterEyebrow: 'Private list',
  newsletterHeading: 'New tech, considered releases.',
  brandDescription: 'Everyday audio, charging and accessories selected for clarity, compatibility and dependable use.',
  columns: [
    {
      heading: 'Shop',
      links: [
        { label: 'New arrivals', href: '/collections/new' },
        { label: 'Audio', href: '/collections/audio' },
        { label: 'Charging', href: '/collections/charging' },
        { label: 'Cables', href: '/collections/cables' },
      ],
    },
    {
      heading: 'Help',
      links: [
        { label: 'Shipping', href: '/pages/shipping' },
        { label: 'Returns & exchanges', href: '/pages/returns' },
        { label: 'Compatibility guide', href: '/pages/compatibility-guide' },
        { label: 'Contact', href: '/pages/contact' },
      ],
    },
  ],
  supportHeading: 'Support',
  supportLines: ['Pakistan-wide delivery', 'Monday–Saturday', '9:00–21:00 PKT'],
  legalLinks: [
    { label: 'Privacy', href: '/pages/privacy' },
    { label: 'Terms', href: '/pages/terms' },
  ],
};

const DEFAULT_THEME = {
  paper: '#f7f5f1',
  ink: '#171717',
  muted: '#6e6b66',
  soft: '#ece8e1',
  cream: '#dfd5c5',
};

function defaultStorefrontData() {
  return {
    id: 'primary',
    siteName: process.env.STORE_NAME || 'Cosmic Tech',
    logoUrl: null,
    logoAlt: process.env.STORE_NAME || 'Cosmic Tech',
    faviconUrl: null,
    announcementText: 'Pakistan-wide delivery · Secure checkout · Compatibility support',
    announcementLinkLabel: null,
    announcementLinkUrl: null,
    supportEmail: process.env.SUPPORT_EMAIL || null,
    supportPhone: null,
    navigation: DEFAULT_NAVIGATION,
    homepage: DEFAULT_HOMEPAGE,
    footer: DEFAULT_FOOTER,
    theme: DEFAULT_THEME,
  };
}

function mergeObject(defaultValue, storedValue) {
  if (!storedValue || typeof storedValue !== 'object' || Array.isArray(storedValue)) return defaultValue;
  return { ...defaultValue, ...storedValue };
}

function publicStorefrontSettings(row) {
  const defaults = defaultStorefrontData();
  if (!row) return defaults;
  return {
    id: row.id || defaults.id,
    siteName: row.siteName || defaults.siteName,
    logoUrl: row.logoUrl || null,
    logoAlt: row.logoAlt || row.siteName || defaults.logoAlt,
    faviconUrl: row.faviconUrl || null,
    announcementText: row.announcementText || null,
    announcementLinkLabel: row.announcementLinkLabel || null,
    announcementLinkUrl: row.announcementLinkUrl || null,
    supportEmail: row.supportEmail || null,
    supportPhone: row.supportPhone || null,
    navigation: Array.isArray(row.navigation) ? row.navigation : defaults.navigation,
    homepage: mergeObject(defaults.homepage, row.homepage),
    footer: mergeObject(defaults.footer, row.footer),
    theme: mergeObject(defaults.theme, row.theme),
  };
}

module.exports = {
  DEFAULT_NAVIGATION,
  DEFAULT_HOMEPAGE,
  DEFAULT_FOOTER,
  DEFAULT_THEME,
  defaultStorefrontData,
  publicStorefrontSettings,
};
