require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@store.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, role: 'SUPERADMIN', name: process.env.SEED_ADMIN_NAME || 'Store Super Admin' },
    create: { email, passwordHash, role: 'SUPERADMIN', name: process.env.SEED_ADMIN_NAME || 'Store Super Admin' },
    select: { id: true, email: true, role: true },
  });
  console.log(`Admin password reset for ${admin.email} (${admin.role}).`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
