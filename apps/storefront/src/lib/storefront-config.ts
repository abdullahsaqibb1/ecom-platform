import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { StorefrontFontFamily, StorefrontSettings } from '../types/domain';
import { getStorefrontSettings } from './api';

export const fallbackStorefrontSettings: StorefrontSettings = {
  siteName: import.meta.env.VITE_STORE_NAME ?? 'COSMIC TECH',
  logoUrl: null,
  logoAlt: import.meta.env.VITE_STORE_NAME ?? 'COSMIC TECH',
  faviconUrl: null,
  announcementText: 'Pakistan-wide delivery · Secure checkout · Compatibility support',
  announcementLinkLabel: null,
  announcementLinkUrl: null,
  supportEmail: null,
  supportPhone: null,
  navigation: [
    { label: 'New', href: '/collections/new', isVisible: true },
    { label: 'Audio', href: '/collections/audio', isVisible: true },
    { label: 'Charging', href: '/collections/charging', isVisible: true },
    { label: 'Cables', href: '/collections/cables', isVisible: true },
    { label: 'Power', href: '/collections/power', isVisible: true },
    { label: 'Accessories', href: '/collections/accessories', isVisible: true },
  ],
  homepage: {
    hero: { eyebrow: 'Everyday audio / power / connection', heading: 'Better sound.\nCleaner connections.', body: '', ctaLabel: 'Discover new tech', ctaUrl: '/collections/new', imageUrl: '', visualType: 'EARBUDS_ANIMATION' },
    productSections: [{ title: 'New arrivals', collectionSlug: 'new', limit: 4 }, { title: 'Everyday upgrades', collectionSlug: 'all', limit: 4 }],
    editorialPanels: [
      { eyebrow: 'Audio', heading: 'Sound, reduced to what matters.', ctaLabel: 'Explore audio', ctaUrl: '/collections/audio', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1500&q=90' },
      { eyebrow: 'Charging', heading: 'Power, cleanly considered.', ctaLabel: 'Explore charging', ctaUrl: '/collections/charging', imageUrl: 'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?auto=format&fit=crop&w=1500&q=90' },
    ],
    statement: { eyebrow: 'Our perspective', heading: 'Technology should feel useful beyond the unboxing—simple enough to live with, reliable enough to reach for every day.', ctaLabel: 'Read our approach', ctaUrl: '/pages/about' },
    mosaic: [
      { label: 'Earbuds', href: '/collections/earbuds', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=90' },
      { label: 'Cables', href: '/collections/cables', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=90' },
      { label: 'Accessories', href: '/collections/accessories', imageUrl: 'https://images.unsplash.com/photo-1622445275576-721325763afe?auto=format&fit=crop&w=1200&q=90' },
    ],
  },
  footer: {
    newsletterEyebrow: 'Private list', newsletterHeading: 'New tech, considered releases.', brandDescription: 'Everyday audio, charging and accessories selected for clarity, compatibility and dependable use.',
    columns: [
      { heading: 'Shop', links: [{ label: 'New arrivals', href: '/collections/new' }, { label: 'Audio', href: '/collections/audio' }, { label: 'Charging', href: '/collections/charging' }, { label: 'Cables', href: '/collections/cables' }] },
      { heading: 'Help', links: [{ label: 'Shipping', href: '/pages/shipping' }, { label: 'Returns & exchanges', href: '/pages/returns' }, { label: 'Compatibility guide', href: '/pages/compatibility-guide' }, { label: 'Contact', href: '/pages/contact' }] },
    ],
    supportHeading: 'Support', supportLines: ['Pakistan-wide delivery', 'Monday–Saturday', '9:00–21:00 PKT'], legalLinks: [{ label: 'Privacy', href: '/pages/privacy' }, { label: 'Terms', href: '/pages/terms' }],
  },
  theme: { paper: '#f7f5f1', ink: '#171717', muted: '#6e6b66', soft: '#ece8e1', cream: '#dfd5c5' },
  typography: {
    preset: 'COSMIC_EDITORIAL', displayFont: 'Italiana', bodyFont: 'DM Sans', navFont: 'DM Sans', buttonFont: 'DM Sans', labelFont: 'DM Sans',
    displayWeight: 400, bodyWeight: 400, navWeight: 500, buttonWeight: 600, labelWeight: 600,
    displayLetterSpacing: -0.02, bodyLetterSpacing: 0, navLetterSpacing: 0.08, buttonLetterSpacing: 0.10, labelLetterSpacing: 0.14,
  },
};

const SERIF_FONTS = new Set<StorefrontFontFamily>(['Italiana', 'Cormorant Garamond', 'Playfair Display', 'Bodoni Moda', 'DM Serif Display', 'Libre Baskerville', 'Instrument Serif', 'Lora']);
function fontStack(font: StorefrontFontFamily) {
  return `"${font}", ${SERIF_FONTS.has(font) ? 'Georgia, serif' : 'Arial, sans-serif'}`;
}

export function useStorefrontConfig() {
  const query = useQuery({ queryKey: ['storefront-config'], queryFn: getStorefrontSettings, staleTime: 60_000, retry: 1 });
  const settings = query.data ?? fallbackStorefrontSettings;
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--paper', settings.theme.paper);
    root.style.setProperty('--ink', settings.theme.ink);
    root.style.setProperty('--muted', settings.theme.muted);
    root.style.setProperty('--soft', settings.theme.soft);
    root.style.setProperty('--cream', settings.theme.cream);
    root.style.setProperty('--font-display', fontStack(settings.typography.displayFont));
    root.style.setProperty('--font-body', fontStack(settings.typography.bodyFont));
    root.style.setProperty('--font-nav', fontStack(settings.typography.navFont));
    root.style.setProperty('--font-button', fontStack(settings.typography.buttonFont));
    root.style.setProperty('--font-label', fontStack(settings.typography.labelFont));
    root.style.setProperty('--font-display-weight', String(settings.typography.displayWeight));
    root.style.setProperty('--font-body-weight', String(settings.typography.bodyWeight));
    root.style.setProperty('--font-nav-weight', String(settings.typography.navWeight));
    root.style.setProperty('--font-button-weight', String(settings.typography.buttonWeight));
    root.style.setProperty('--font-label-weight', String(settings.typography.labelWeight));
    root.style.setProperty('--tracking-display', `${settings.typography.displayLetterSpacing}em`);
    root.style.setProperty('--tracking-body', `${settings.typography.bodyLetterSpacing}em`);
    root.style.setProperty('--tracking-nav', `${settings.typography.navLetterSpacing}em`);
    root.style.setProperty('--tracking-button', `${settings.typography.buttonLetterSpacing}em`);
    root.style.setProperty('--tracking-label', `${settings.typography.labelLetterSpacing}em`);
    document.title = settings.siteName;
    if (settings.faviconUrl) {
      let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
      icon.href = settings.faviconUrl;
    }
  }, [settings]);
  return { ...query, settings };
}
