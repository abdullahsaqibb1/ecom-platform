import type { Category, Product } from '../types/domain';

export const mockCategories: Category[] = [
  { id: 'cat-new', name: 'New', slug: 'new' },
  { id: 'cat-women', name: 'Women', slug: 'women' },
  { id: 'cat-men', name: 'Men', slug: 'men' },
  { id: 'cat-footwear', name: 'Footwear', slug: 'footwear' },
  { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
];

const img = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export const mockProducts: Product[] = [
  {
    id: 'p1', slug: 'linen-resort-shirt', name: 'Linen Resort Shirt', description: 'A relaxed linen-blend shirt with a clean resort collar, fluid drape and softly structured finish.', price: 7950, compareAtPrice: null, stock: 24, isActive: true, categoryId: 'cat-women', category: mockCategories[1], color: 'Oat', material: '55% linen, 45% cotton', images: [img('photo-1594633312681-425c7b97ccd1'), img('photo-1551488831-00ddcb6c6bd3')], variants: ['XS','S','M','L','XL'].map((size, index) => ({ id: `p1-${size}`, sku: `LRS-${size}`, size, color: 'Oat', stock: index === 4 ? 0 : 5 })), tags: ['new', 'women']
  },
  {
    id: 'p2', slug: 'wide-leg-tailored-pants', name: 'Wide-Leg Tailored Pants', description: 'High-rise tailoring with a long, easy silhouette and pressed front crease.', price: 8950, stock: 18, isActive: true, categoryId: 'cat-women', category: mockCategories[1], color: 'Black', material: 'Viscose blend', images: [img('photo-1506629082955-511b1aa562c8'), img('photo-1594633313593-bab3825d0caf')], variants: ['XS','S','M','L','XL'].map((size) => ({ id: `p2-${size}`, sku: `WTP-${size}`, size, color: 'Black', stock: 4 })), tags: ['new', 'women']
  },
  {
    id: 'p3', slug: 'textured-polo', name: 'Textured Polo', description: 'A soft knit polo with a refined open collar and subtle surface texture.', price: 5950, stock: 30, isActive: true, categoryId: 'cat-men', category: mockCategories[2], color: 'Stone', material: 'Cotton knit', images: [img('photo-1617137968427-85924c800a22'), img('photo-1603252109303-2751441dd157')], variants: ['S','M','L','XL','XXL'].map((size) => ({ id: `p3-${size}`, sku: `TXP-${size}`, size, color: 'Stone', stock: 6 })), tags: ['men']
  },
  {
    id: 'p4', slug: 'minimal-leather-sandal', name: 'Minimal Leather Sandal', description: 'An understated leather sandal with a shaped footbed and slim crossover straps.', price: 6450, stock: 14, isActive: true, categoryId: 'cat-footwear', category: mockCategories[3], color: 'Coffee', material: 'Leather upper', images: [img('photo-1603487742131-4160ec999306'), img('photo-1543163521-1bf539c55dd2')], variants: ['36','37','38','39','40','41'].map((size) => ({ id: `p4-${size}`, sku: `MLS-${size}`, size, color: 'Coffee', stock: 3 })), tags: ['footwear']
  },
  {
    id: 'p5', slug: 'structured-day-tote', name: 'Structured Day Tote', description: 'A roomy everyday tote with clean handles, a reinforced base and internal pocketing.', price: 9950, stock: 11, isActive: true, categoryId: 'cat-accessories', category: mockCategories[4], color: 'Espresso', material: 'Textured vegan leather', images: [img('photo-1594223274512-ad4803739b7c'), img('photo-1553062407-98eeb64c6a62')], variants: [{ id: 'p5-u', sku: 'SDT-UNI', size: 'Universal', color: 'Espresso', stock: 11 }], tags: ['accessories']
  },
  {
    id: 'p6', slug: 'soft-column-dress', name: 'Soft Column Dress', description: 'A long column dress with soft gathering and a clean, modern neckline.', price: 10950, stock: 17, isActive: true, categoryId: 'cat-women', category: mockCategories[1], color: 'Ivory', material: 'Rayon blend', images: [img('photo-1595777457583-95e059d581b8'), img('photo-1566174053879-31528523f8ae')], variants: ['XS','S','M','L','XL'].map((size) => ({ id: `p6-${size}`, sku: `SCD-${size}`, size, color: 'Ivory', stock: 4 })), tags: ['women']
  },
  {
    id: 'p7', slug: 'relaxed-utility-shirt', name: 'Relaxed Utility Shirt', description: 'A crisp utility shirt with tonal buttons, oversized pockets and a relaxed proportion.', price: 7450, stock: 22, isActive: true, categoryId: 'cat-men', category: mockCategories[2], color: 'Olive', material: 'Cotton twill', images: [img('photo-1620012253295-c15cc3e65df4'), img('photo-1607345366928-199ea26cfe3e')], variants: ['S','M','L','XL','XXL'].map((size) => ({ id: `p7-${size}`, sku: `RUS-${size}`, size, color: 'Olive', stock: 5 })), tags: ['men', 'new']
  },
  {
    id: 'p8', slug: 'low-profile-sneaker', name: 'Low-Profile Sneaker', description: 'A clean everyday sneaker balancing a slim profile with a cushioned sole.', price: 12950, stock: 16, isActive: true, categoryId: 'cat-footwear', category: mockCategories[3], color: 'Off White', material: 'Leather and textile', images: [img('photo-1549298916-b41d501d3772'), img('photo-1542291026-7eec264c27ff')], variants: ['40','41','42','43','44','45'].map((size) => ({ id: `p8-${size}`, sku: `LPS-${size}`, size, color: 'Off White', stock: 3 })), tags: ['footwear', 'new']
  }
];
