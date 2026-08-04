const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const required = [
  'apps/storefront/package.json',
  'apps/storefront/src/vite-env.d.ts',
  'apps/storefront/src/pages/PaymentResultPages.tsx',
  'apps/storefront/vercel.json',
  'apps/admin/package.json',
  'apps/admin/src/vite-env.d.ts',
  'apps/admin/src/features/products/ProductForm.tsx',
  'apps/admin/src/features/orders/OrdersPage.tsx',
  'apps/admin/vercel.json',
  'apps/backend/package.json',
  'apps/backend/api/index.js',
  'apps/backend/vercel.json',
  'apps/backend/src/safepay.js',
  'apps/backend/src/cloudinary.js',
  'apps/backend/src/email.js',
  'apps/backend/prisma/schema.prisma',
  'apps/backend/prisma/seed.js',
  'apps/backend/prisma/migrations/202608010001_init/migration.sql',
  'apps/backend/prisma/migrations/202608040001_launch_commerce/migration.sql',
  'LAUNCH_SPRINT_SETUP.md',
  'LAUNCH_SPRINT_CHANGELOG.md',
];

const contentChecks = [
  ['apps/backend/src/app.js', '/api/webhooks/safepay'],
  ['apps/backend/src/app.js', '/api/admin/uploads/signature'],
  ['apps/backend/src/app.js', '/api/admin/orders/:id/shipment'],
  ['apps/backend/src/app.js', 'emailEvents.paymentConfirmed'],
  ['apps/backend/src/safepay.js', "createHmac('sha512'"],
  ['apps/backend/src/cloudinary.js', 'api_sign_request'],
  ['apps/backend/src/email.js', 'https://api.resend.com/emails'],
  ['apps/backend/prisma/schema.prisma', 'model PaymentEvent'],
  ['apps/backend/prisma/schema.prisma', 'model NotificationLog'],
  ['apps/backend/prisma/schema.prisma', 'model MediaAsset'],
  ['apps/admin/src/lib/api.ts', 'uploadProductImage'],
  ['apps/storefront/src/pages/CheckoutPage.tsx', 'result.payment.checkoutUrl'],
];

let failed = false;
for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error('Missing:', file);
    failed = true;
  } else {
    console.log('OK:', file);
  }
}

for (const [file, needle] of contentChecks) {
  const full = path.join(root, file);
  const content = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (!content.includes(needle)) {
    console.error(`Missing implementation marker in ${file}: ${needle}`);
    failed = true;
  } else {
    console.log(`OK marker: ${file} -> ${needle}`);
  }
}

const backendJs = [
  ...fs.readdirSync(path.join(root, 'apps/backend/src')).filter((name) => name.endsWith('.js')).map((name) => `apps/backend/src/${name}`),
  'apps/backend/api/index.js',
  'apps/backend/server.js',
  'apps/backend/prisma/seed.js',
  'apps/backend/prisma/reset-admin.js',
];
for (const file of backendJs) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`Syntax failure: ${file}\n${result.stderr}`);
    failed = true;
  } else {
    console.log('Syntax OK:', file);
  }
}

if (failed) process.exit(1);
console.log('\nPackage structure and launch-sprint implementation markers are complete.');
console.log('Run full npm builds after installing public dependencies.');
