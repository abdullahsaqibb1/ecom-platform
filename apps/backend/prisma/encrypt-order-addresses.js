require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { protectShippingAddress } = require('../src/security');

const prisma = new PrismaClient();

async function main() {
  if (!process.env.SENSITIVE_DATA_KEY?.trim()) {
    throw new Error('SENSITIVE_DATA_KEY must be configured before encrypting historical order addresses.');
  }
  const orders = await prisma.order.findMany({
    where: { shippingAddressEncrypted: null },
    select: { id: true, shippingAddress: true },
  });
  let encrypted = 0;
  for (const order of orders) {
    if (!order.shippingAddress || order.shippingAddress.protected === true) continue;
    const protectedAddress = protectShippingAddress(order.shippingAddress);
    if (!protectedAddress.shippingAddressEncrypted) throw new Error('Sensitive-data encryption did not initialize.');
    await prisma.order.update({ where: { id: order.id }, data: protectedAddress });
    encrypted += 1;
  }
  console.log(`Encrypted shipping addresses for ${encrypted} order(s).`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
