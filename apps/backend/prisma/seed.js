require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  { name: 'AirPods & Earbuds', slug: 'earbuds', sortOrder: 10 },
  { name: 'Headphones', slug: 'headphones', sortOrder: 20 },
  { name: 'Chargers', slug: 'chargers', sortOrder: 30 },
  { name: 'Cables', slug: 'cables', sortOrder: 40 },
  { name: 'Power Banks', slug: 'power-banks', sortOrder: 50 },
  { name: 'Accessories', slug: 'accessories', sortOrder: 60 },
];

const collections = [
  { name: 'New Arrivals', slug: 'new-arrivals', isFeatured: true, sortOrder: 10 },
  { name: 'Fast Charging', slug: 'fast-charging', isFeatured: true, sortOrder: 20 },
  { name: 'iPhone Essentials', slug: 'iphone-essentials', isFeatured: true, sortOrder: 30 },
  { name: 'Best Sellers', slug: 'best-sellers', isFeatured: true, sortOrder: 40 },
];

const paymentMethods = [
  {
    code: 'cod', provider: 'manual', displayName: 'Cash on delivery',
    description: 'Pay in cash when the order arrives.', isEnabled: true,
    requiresOnlinePayment: false, sortOrder: 10,
  },
  {
    code: 'bank-transfer', provider: 'bank_transfer', displayName: 'Bank transfer',
    description: 'Place the order and follow the bank-transfer instructions.', isEnabled: false,
    requiresOnlinePayment: false, sortOrder: 20,
  },
  {
    code: 'safepay', provider: 'safepay', displayName: 'Card / online payment',
    description: 'Pay securely through Safepay.', isEnabled: Boolean(process.env.SAFEPAY_API_KEY && process.env.SAFEPAY_SECRET_KEY),
    requiresOnlinePayment: true, sortOrder: 30,
  },
];

const samples = [
  {
    name: 'Orbit Pro Wireless Earbuds', slug: 'orbit-pro-wireless-earbuds', category: 'earbuds', price: 8990,
    brand: 'Cosmic Tech', model: 'Orbit Pro', warrantyMonths: 12,
    description: 'Compact wireless earbuds with active noise cancellation, clear calls, USB-C charging and a pocket-sized case.',
    tags: ['earbuds', 'bluetooth', 'usb-c'], compatibility: ['Bluetooth', 'iPhone', 'Android', 'USB-C'],
    specifications: { 'Bluetooth version': '5.3', 'Battery life': 'Up to 30 hours', Charging: 'USB-C', 'Noise control': 'Active noise cancellation' },
    highlights: ['Active noise cancellation', 'Low-latency mode', 'Clear dual-mic calls'],
    whatsInBox: ['Earbuds', 'Charging case', 'USB-C cable', 'Ear tips'],
    images: ['https://placehold.co/1200x1200/E7E4DE/171717?text=Orbit+Pro+Earbuds'],
    variants: [
      { sku: 'ORB-PRO-WHT', size: 'USB-C case', color: 'White', stock: 18 },
      { sku: 'ORB-PRO-BLK', size: 'USB-C case', color: 'Black', stock: 14 },
    ],
    collections: ['new-arrivals', 'best-sellers'],
  },
  {
    name: 'Flux GaN Charger 65W', slug: 'flux-gan-charger-65w', category: 'chargers', price: 6490,
    brand: 'Cosmic Tech', model: 'Flux 65', warrantyMonths: 12,
    description: 'A compact 65W GaN wall charger with USB-C Power Delivery for phones, tablets and compatible laptops.',
    tags: ['charger', 'gan', 'usb-c-pd'], compatibility: ['USB-C PD', 'iPhone', 'Android', 'MacBook', 'Laptop'],
    specifications: { Output: '65W maximum', Ports: '2 × USB-C, 1 × USB-A', Technology: 'GaN', Input: '100–240V' },
    highlights: ['Compact GaN design', 'Three-device charging', 'Power Delivery support'],
    whatsInBox: ['65W GaN charger', 'User guide'],
    images: ['https://placehold.co/1200x1200/DDDAD4/171717?text=Flux+65W+GaN'],
    variants: [
      { sku: 'FLX65-UK-GPH', size: '65W · UK plug', color: 'Graphite', stock: 20 },
      { sku: 'FLX65-EU-GPH', size: '65W · EU plug', color: 'Graphite', stock: 10 },
    ],
    collections: ['fast-charging', 'best-sellers'],
  },
  {
    name: 'Link Braided USB-C Cable', slug: 'link-braided-usb-c-cable', category: 'cables', price: 2190,
    brand: 'Cosmic Tech', model: 'Link 100W', warrantyMonths: 6,
    description: 'A durable braided USB-C to USB-C cable supporting up to 100W charging and fast data transfer.',
    tags: ['cable', 'usb-c', '100w'], compatibility: ['USB-C', 'Power Delivery', 'Android', 'MacBook', 'Laptop'],
    specifications: { Connector: 'USB-C to USB-C', Power: 'Up to 100W', Material: 'Braided nylon', Data: 'USB 2.0' },
    highlights: ['100W charging', 'Reinforced connectors', 'Braided exterior'],
    whatsInBox: ['Braided USB-C cable'],
    images: ['https://placehold.co/1200x1200/EAE7E1/171717?text=Link+100W+Cable'],
    variants: [
      { sku: 'LNK100-1M-BLK', size: '1 metre', color: 'Black', stock: 30 },
      { sku: 'LNK100-2M-BLK', size: '2 metres', color: 'Black', stock: 24, price: 2690 },
    ],
    collections: ['fast-charging', 'iphone-essentials'],
  },
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured before running the seed.`);
  return value;
}

async function main() {
  const adminEmail = requiredEnv('SEED_ADMIN_EMAIL').toLowerCase();
  const adminPassword = requiredEnv('SEED_ADMIN_PASSWORD');
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        name: process.env.SEED_ADMIN_NAME || 'Store Super Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: 'SUPERADMIN',
      },
    });
    console.log(`Created superadmin: ${adminEmail}`);
  } else {
    console.log(`Superadmin already exists: ${adminEmail}`);
  }

  const categoryMap = {};
  for (const category of categories) {
    categoryMap[category.slug] = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder, isActive: true },
      create: category,
    });
  }

  const collectionMap = {};
  for (const collection of collections) {
    collectionMap[collection.slug] = await prisma.collection.upsert({
      where: { slug: collection.slug },
      update: { name: collection.name, isFeatured: collection.isFeatured, sortOrder: collection.sortOrder },
      create: collection,
    });
  }

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: method.code },
      update: {},
      create: method,
    });
  }

  for (const sample of samples) {
    const exists = await prisma.product.findUnique({ where: { slug: sample.slug }, select: { id: true } });
    if (exists) continue;
    const totalStock = sample.variants.reduce((sum, item) => sum + item.stock, 0);
    await prisma.product.create({
      data: {
        name: sample.name,
        slug: sample.slug,
        description: sample.description,
        price: sample.price,
        stock: totalStock,
        lowStockThreshold: 5,
        images: sample.images,
        isActive: true,
        status: 'ACTIVE',
        brand: sample.brand,
        model: sample.model,
        warrantyMonths: sample.warrantyMonths,
        compatibility: sample.compatibility,
        specifications: sample.specifications,
        highlights: sample.highlights,
        whatsInBox: sample.whatsInBox,
        careInstructions: [],
        tags: sample.tags,
        categoryId: categoryMap[sample.category].id,
        variants: { create: sample.variants },
        collections: { create: sample.collections.map((collectionSlug, position) => ({ collectionId: collectionMap[collectionSlug].id, position })) },
      },
    });
  }
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
