const fs = require('fs');
const path = require('path');

const required = [
  'apps/storefront/package.json',
  'apps/storefront/src/vite-env.d.ts',
  'apps/storefront/vercel.json',
  'apps/admin/package.json',
  'apps/admin/src/vite-env.d.ts',
  'apps/admin/vercel.json',
  'apps/backend/package.json',
  'apps/backend/api/index.js',
  'apps/backend/vercel.json',
  'apps/backend/prisma/schema.prisma',
  'apps/backend/prisma/seed.js',
  'apps/backend/prisma/migrations/202608010001_init/migration.sql',
];

let failed = false;
for (const file of required) {
  const full = path.join(__dirname, '..', file);
  if (!fs.existsSync(full)) {
    console.error('Missing:', file);
    failed = true;
  } else {
    console.log('OK:', file);
  }
}
if (failed) process.exit(1);
console.log('\nPackage structure is complete. Dependency builds must be run after npm install.');
