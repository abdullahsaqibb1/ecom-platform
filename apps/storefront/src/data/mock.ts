import type { Category, Product } from '../types/domain';

export const mockCategories: Category[] = [
  { id: 'cat-new', name: 'New arrivals', slug: 'new' },
  { id: 'cat-audio', name: 'Audio', slug: 'audio' },
  { id: 'cat-earbuds', name: 'Earbuds', slug: 'earbuds' },
  { id: 'cat-charging', name: 'Charging', slug: 'charging' },
  { id: 'cat-cables', name: 'Cables', slug: 'cables' },
  { id: 'cat-power', name: 'Power', slug: 'power' },
  { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
];

const img = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=88`;

export const mockProducts: Product[] = [
  {
    id: 'tech-1', slug: 'aero-buds-pro', name: 'Aero Buds Pro', description: 'True-wireless earbuds with noise reduction, low-latency listening and a compact USB-C charging case.', price: 7990, compareAtPrice: 8990, stock: 28, isActive: true, categoryId: 'cat-earbuds', category: mockCategories[2], color: 'Pearl White', material: 'Bluetooth 5.3 · USB-C charging', images: [img('photo-1590658268037-6bf12165a8df'), img('photo-1600294037681-c80b4cb5b434')], variants: [{ id: 'tech-1-white', sku: 'ABP-WHT', size: 'USB-C case', color: 'Pearl White', stock: 15 }, { id: 'tech-1-black', sku: 'ABP-BLK', size: 'USB-C case', color: 'Midnight Black', stock: 13 }], tags: ['Noise reduction', 'Bluetooth 5.3', 'Touch controls'], careInstructions: ['Earbuds and USB-C charging case', 'Multiple ear-tip sizes', 'USB-C charging cable'],
  },
  {
    id: 'tech-2', slug: 'flux-gan-charger-65w', name: 'Flux GaN Charger 65W', description: 'A compact dual-port GaN charger built to power phones, tablets and compatible laptops without the bulk.', price: 5490, stock: 36, isActive: true, categoryId: 'cat-charging', category: mockCategories[3], color: 'Graphite', material: 'USB-C PD · GaN technology', images: [img('photo-1615526675159-e248c3021d3f'), img('photo-1583863788434-e58a36330cf0')], variants: [{ id: 'tech-2-uk', sku: 'FG65-UK', size: '65W · UK plug', color: 'Graphite', stock: 22 }, { id: 'tech-2-eu', sku: 'FG65-EU', size: '65W · EU plug', color: 'Graphite', stock: 14 }], tags: ['65W output', 'USB-C PD', 'Dual port'], careInstructions: ['65W GaN charger', 'Quick-start guide'],
  },
  {
    id: 'tech-3', slug: 'core-braided-usbc-cable', name: 'Core Braided USB-C Cable', description: 'A reinforced USB-C cable made for fast charging, dependable data transfer and everyday bending.', price: 1590, stock: 62, isActive: true, categoryId: 'cat-cables', category: mockCategories[4], color: 'Black', material: '100W USB-C · Braided shell', images: [img('photo-1558618666-fcd25c85cd64'), img('photo-1625842268584-8f3296236761')], variants: [{ id: 'tech-3-1m', sku: 'CBC-1M', size: '1 metre', color: 'Black', stock: 34 }, { id: 'tech-3-2m', sku: 'CBC-2M', size: '2 metres', color: 'Black', price: 1990, stock: 28 }], tags: ['100W charging', 'USB-C to USB-C', 'Braided'], careInstructions: ['Braided USB-C cable', 'Reusable cable tie'],
  },
  {
    id: 'tech-4', slug: 'studio-wave-headphones', name: 'Studio Wave Headphones', description: 'Over-ear wireless headphones with immersive sound, comfortable cushions and long-listening battery life.', price: 11990, compareAtPrice: 13990, stock: 20, isActive: true, categoryId: 'cat-audio', category: mockCategories[1], color: 'Matte Black', material: 'Wireless · USB-C · Foldable', images: [img('photo-1505740420928-5e560c06d30e'), img('photo-1484704849700-f032a568e944')], variants: [{ id: 'tech-4-black', sku: 'SWH-BLK', size: 'Standard', color: 'Matte Black', stock: 12 }, { id: 'tech-4-silver', sku: 'SWH-SLV', size: 'Standard', color: 'Silver', stock: 8 }], tags: ['Wireless audio', 'Built-in microphone', 'Foldable'], careInstructions: ['Headphones', 'USB-C charging cable', '3.5mm audio cable'],
  },
  {
    id: 'tech-5', slug: 'snap-power-bank', name: 'Snap Magnetic Power Bank', description: 'A slim magnetic power bank for convenient cable-free charging while you work, travel or commute.', price: 6490, stock: 25, isActive: true, categoryId: 'cat-power', category: mockCategories[5], color: 'Space Grey', material: 'Magnetic wireless charging · USB-C', images: [img('photo-1609091839311-d5365f9ff1c5'), img('photo-1612815154858-60aa4c59eaa6')], variants: [{ id: 'tech-5-5k', sku: 'SPB-5K', size: '5000mAh', color: 'Space Grey', stock: 14 }, { id: 'tech-5-10k', sku: 'SPB-10K', size: '10000mAh', color: 'Space Grey', price: 8490, stock: 11 }], tags: ['Magnetic charging', 'USB-C input', 'LED indicator'], careInstructions: ['Magnetic power bank', 'USB-C charging cable'],
  },
  {
    id: 'tech-6', slug: 'trio-wireless-dock', name: 'Trio Wireless Charging Dock', description: 'A clean three-device charging station for a phone, earbuds and compatible smartwatch.', price: 8990, stock: 18, isActive: true, categoryId: 'cat-charging', category: mockCategories[3], color: 'Black', material: '3-in-1 wireless charging', images: [img('photo-1622445275576-721325763afe'), img('photo-1591290619762-c588f86c352b')], variants: [{ id: 'tech-6-black', sku: 'TWD-BLK', size: '3-device dock', color: 'Black', stock: 18 }], tags: ['Phone charging stand', 'Earbud charging zone', 'Watch module'], careInstructions: ['Charging dock', 'USB-C power cable', 'Power adapter'],
  },
  {
    id: 'tech-7', slug: 'drive-dual-car-charger', name: 'Drive Dual Car Charger', description: 'A low-profile dual-port charger that keeps two devices powered during commutes and road trips.', price: 2790, stock: 41, isActive: true, categoryId: 'cat-charging', category: mockCategories[3], color: 'Black', material: 'USB-C + USB-A · 48W total', images: [img('photo-1597404294360-feeeda04612e'), img('photo-1601972602288-3be527b4f18a')], variants: [{ id: 'tech-7-48w', sku: 'DCC-48', size: '48W dual port', color: 'Black', stock: 41 }], tags: ['USB-C PD', 'USB-A fast charge', '48W total'], careInstructions: ['Dual-port car charger'],
  },
  {
    id: 'tech-8', slug: 'connect-lightning-cable', name: 'Connect Lightning Cable', description: 'A durable everyday charging cable for compatible Lightning devices, with reinforced stress points.', price: 1390, stock: 54, isActive: true, categoryId: 'cat-cables', category: mockCategories[4], color: 'White', material: 'USB-C to Lightning', images: [img('photo-1583394838336-acd977736f90'), img('photo-1551818014-7c8ace9c3cc5')], variants: [{ id: 'tech-8-1m', sku: 'CLC-1M', size: '1 metre', color: 'White', stock: 31 }, { id: 'tech-8-2m', sku: 'CLC-2M', size: '2 metres', color: 'White', price: 1690, stock: 23 }], tags: ['Lightning', 'Fast charge', 'Reinforced'], careInstructions: ['USB-C to Lightning cable'],
  },
];
