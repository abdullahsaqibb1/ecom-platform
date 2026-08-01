# Deploy All Three Applications on Vercel

Use one GitHub repository and create three Vercel projects from it.

## 1. Upload the repository

Extract this package, create a GitHub repository, and upload the entire folder. Do not upload only one app folder.

## 2. Create PostgreSQL

In Vercel Marketplace, create a serverless PostgreSQL database using Prisma Postgres, Neon, Supabase, or another compatible provider.

Connect the database to the backend project so Vercel provides `DATABASE_URL`. Use a pooled/serverless connection string.

## 3. Deploy the backend first

Import the GitHub repository as a new Vercel project.

- Project name: `your-store-api`
- Root Directory: `apps/backend`
- Framework Preset: Other
- Install Command: `npm install`
- Build Command: `npm run vercel-build`
- Output Directory: leave empty

Set these backend environment variables:

```text
DATABASE_URL=<provided by database integration>
JWT_CUSTOMER_SECRET=<long random secret>
JWT_ADMIN_SECRET=<different long random secret>
JWT_CUSTOMER_EXPIRES_IN=7d
JWT_ADMIN_EXPIRES_IN=8h
CUSTOMER_ORIGINS=https://your-storefront.vercel.app
ADMIN_ORIGINS=https://your-admin.vercel.app
SEED_ADMIN_NAME=Store Super Admin
SEED_ADMIN_EMAIL=admin@store.com
SEED_ADMIN_PASSWORD=Admin@12345
```

Generate secure JWT values locally with:

```bash
node scripts/generate-secrets.js
```

The build command generates Prisma Client, applies migrations, and runs the idempotent seed.

After deployment, open:

```text
https://your-store-api.vercel.app/health
```

A working deployment returns database status `connected`.

## 4. Deploy the admin application

Import the same GitHub repository again.

- Project name: `your-store-admin`
- Root Directory: `apps/admin`
- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variables:

```text
VITE_API_BASE_URL=https://your-store-api.vercel.app
VITE_CURRENCY=PKR
```

Deploy, then log in using the seeded values from `ADMIN_CREDENTIALS.txt`.

## 5. Deploy the storefront

Import the same GitHub repository a third time.

- Project name: `your-storefront`
- Root Directory: `apps/storefront`
- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variables:

```text
VITE_API_BASE_URL=https://your-store-api.vercel.app
VITE_ENABLE_DEMO_FALLBACK=false
VITE_STORE_NAME=YOUR BRAND
VITE_CURRENCY=PKR
```

## 6. Final CORS update

Once Vercel gives you the real storefront and admin URLs, update these backend variables with the exact origins:

```text
CUSTOMER_ORIGINS=https://actual-storefront.vercel.app
ADMIN_ORIGINS=https://actual-admin.vercel.app
```

For custom domains, comma-separate all allowed origins:

```text
CUSTOMER_ORIGINS=https://shop.example.com,https://actual-storefront.vercel.app
ADMIN_ORIGINS=https://admin.example.com,https://actual-admin.vercel.app
```

Redeploy the backend after changing environment variables.

## 7. Verification

1. Backend `/health` reports a connected database.
2. Admin login succeeds.
3. Seeded products appear in Products.
4. Storefront loads products from the API.
5. Create a customer account.
6. Add a size/color variant to cart and place an order.
7. The order appears in Admin → Orders.
8. Move the order through valid statuses.

## Important security notes

- Use different JWT secrets.
- Replace the default admin password.
- Do not put database or JWT secrets in variables beginning with `VITE_`; those are exposed to browsers.
- Only the backend receives `DATABASE_URL` and JWT secrets.
- Use exact production origins in CORS.
