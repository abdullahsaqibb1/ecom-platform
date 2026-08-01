require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  { name: 'Women', slug: 'women' },
  { name: 'Men', slug: 'men' },
  { name: 'Footwear', slug: 'footwear' },
  { name: 'Accessories', slug: 'accessories' },
];

const samples = [
  {
    name: 'Soft Slub Blouse', slug: 'soft-slub-blouse', category: 'women', price: 7490,
    description: 'A relaxed blouse cut from soft slub fabric with an easy drape and understated finish.',
    material: 'Soft slub woven fabric', color: 'Brown', tags: ['women', 'new-arrival'],
    images: ['https://placehold.co/900x1200/E9E2D8/161616?text=Soft+Slub+Blouse', 'https://placehold.co/900x1200/D8CEC1/161616?text=Blouse+Detail'],
    variants: [['SSB-BRN-S', 'S', 'Brown', 5], ['SSB-BRN-M', 'M', 'Brown', 8], ['SSB-BRN-L', 'L', 'Brown', 4]],
  },
  {
    name: 'Fluid Tailored Shirt', slug: 'fluid-tailored-shirt', category: 'women', price: 8490,
    description: 'A fluid long-line shirt with a clean collar, dropped shoulders and a refined everyday silhouette.',
    material: 'Viscose blend', color: 'Ivory', tags: ['women', 'editorial'],
    images: ['https://placehold.co/900x1200/F2EFE9/161616?text=Fluid+Tailored+Shirt', 'https://placehold.co/900x1200/E5E0D8/161616?text=Shirt+Back'],
    variants: [['FTS-IVR-S', 'S', 'Ivory', 6], ['FTS-IVR-M', 'M', 'Ivory', 7], ['FTS-IVR-L', 'L', 'Ivory', 6]],
  },
  {
    name: 'Structured Overshirt', slug: 'structured-overshirt', category: 'men', price: 10990,
    description: 'A clean structured overshirt designed for lightweight layering across seasons.',
    material: 'Cotton twill', color: 'Charcoal', tags: ['men', 'outerwear'],
    images: ['https://placehold.co/900x1200/BBBBB7/161616?text=Structured+Overshirt', 'https://placehold.co/900x1200/A4A49F/161616?text=Overshirt+Detail'],
    variants: [['SOS-CHR-M', 'M', 'Charcoal', 4], ['SOS-CHR-L', 'L', 'Charcoal', 7], ['SOS-CHR-XL', 'XL', 'Charcoal', 3]],
  },
  {
    name: 'Relaxed Pleat Trouser', slug: 'relaxed-pleat-trouser', category: 'men', price: 8990,
    description: 'Relaxed trousers with a considered front pleat, straight leg and clean waistband.',
    material: 'Textured suiting blend', color: 'Stone', tags: ['men', 'trousers'],
    images: ['https://placehold.co/900x1200/D8D2C8/161616?text=Relaxed+Pleat+Trouser', 'https://placehold.co/900x1200/C7C0B6/161616?text=Trouser+Detail'],
    variants: [['RPT-STN-30', '30', 'Stone', 5], ['RPT-STN-32', '32', 'Stone', 8], ['RPT-STN-34', '34', 'Stone', 5]],
  },
  {
    name: 'Minimal Leather Slide', slug: 'minimal-leather-slide', category: 'footwear', price: 11990,
    description: 'A minimal leather slide with a shaped footbed and wide upper for everyday wear.',
    material: 'Leather upper and lining', color: 'Black', tags: ['footwear', 'unisex'],
    images: ['https://placehold.co/900x1200/D7D7D4/161616?text=Minimal+Leather+Slide', 'https://placehold.co/900x1200/C4C4C0/161616?text=Slide+Profile'],
    variants: [['MLS-BLK-40', '40', 'Black', 3], ['MLS-BLK-41', '41', 'Black', 5], ['MLS-BLK-42', '42', 'Black', 6], ['MLS-BLK-43', '43', 'Black', 4]],
  },
  {
    name: 'Everyday Carry Tote', slug: 'everyday-carry-tote', category: 'accessories', price: 6490,
    description: 'A spacious everyday tote with a structured base, interior pocket and restrained detailing.',
    material: 'Heavy cotton canvas', color: 'Natural', tags: ['accessories', 'bag'],
    images: ['https://placehold.co/900x1200/E8E0D1/161616?text=Everyday+Carry+Tote', 'https://placehold.co/900x1200/D6CBB9/161616?text=Tote+Interior'],
    variants: [], stock: 18,
  },
];

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@store.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
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
      update: {},
      create: category,
    });
  }

  for (const sample of samples) {
    const exists = await prisma.product.findUnique({ where: { slug: sample.slug }, select: { id: true } });
    if (exists) continue;
    const variants = sample.variants.map(([sku, size, color, stock]) => ({ sku, size, color, stock }));
    const totalStock = sample.stock ?? variants.reduce((sum, item) => sum + item.stock, 0);
    await prisma.product.create({
      data: {
        name: sample.name,
        slug: sample.slug,
        description: sample.description,
        price: sample.price,
        stock: totalStock,
        images: sample.images,
        isActive: true,
        material: sample.material,
        color: sample.color,
        careInstructions: ['Follow the care label.', 'Store clean and dry.'],
        tags: sample.tags,
        categoryId: categoryMap[sample.category].id,
        ...(variants.length ? { variants: { create: variants } } : {}),
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
