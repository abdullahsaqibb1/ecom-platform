require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured before resetting an admin.`);
  return value;
}

async function main() {
  const email = requiredEnv('SEED_ADMIN_EMAIL').toLowerCase();
  const password = requiredEnv('SEED_ADMIN_PASSWORD');
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
