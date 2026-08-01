# Complete E-commerce Vercel Package

A three-project e-commerce monorepo:

- `apps/storefront` — customer-facing React/Vite store
- `apps/admin` — separate React/Vite admin application and admin auth storage
- `apps/backend` — Express API deployed as a Vercel Function, PostgreSQL through Prisma

The customer and admin identity systems are deliberately separate:

- Separate `User` and `Admin` database models
- Separate login routes
- Separate JWT signing secrets
- Token payloads carry a required `kind` (`customer` or `admin`)
- Customer tokens cannot authenticate admin middleware
- Admin tokens cannot authenticate customer middleware
- Storefront and admin use different browser storage keys

## Included functionality

### Storefront

- Editorial fashion-retail homepage
- Collections and product search
- Product detail pages
- Size/color variant selection
- Cart drawer and cart page
- Customer registration and login
- Checkout with server-side price calculation
- Customer order history
- Responsive SPA routing for Vercel

### Admin

- Separate admin login
- Dashboard metrics
- Products: create, edit, deactivate
- Product image URLs
- Size/color/SKU/price/stock variant matrix
- Categories: create and delete
- Orders: view/filter and valid status transitions
- Superadmin account creation
- Responsive SPA routing for Vercel

### Backend

- Express + PostgreSQL + Prisma
- Separate customer/admin JWT secrets
- bcrypt password hashing
- zod validation on every write route
- Helmet, restricted CORS, general and auth rate limits
- Transactional order price calculation and inventory decrement
- Variant-level stock enforcement
- Stock restoration when a pending/paid order is cancelled
- Soft product deactivation
- Prisma migration and idempotent seed
- Six sample fashion products and four categories

## Admin login

Default seed values are documented in `ADMIN_CREDENTIALS.txt`.

- Email: `admin@store.com`
- Password: `Admin@12345`

Change these through Vercel environment variables before the first production deployment.

## Deployment

Follow `DEPLOY_TO_VERCEL.md`. The same GitHub repository is imported into Vercel three times, each with a different Root Directory.

## Local setup

1. Install each app:

```bash
npm --prefix apps/backend install
npm --prefix apps/storefront install
npm --prefix apps/admin install
```

2. Copy environment files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/storefront/.env.example apps/storefront/.env
cp apps/admin/.env.example apps/admin/.env
```

3. Create a PostgreSQL database and place its pooled URL in `apps/backend/.env`.

4. Generate JWT secrets:

```bash
npm run generate:secrets
```

5. Migrate and seed:

```bash
npm --prefix apps/backend run db:deploy
npm --prefix apps/backend run db:seed
```

6. Start each app in a separate terminal:

```bash
npm run dev:backend
npm run dev:storefront
npm run dev:admin
```

Local defaults:

- Backend: `http://localhost:4000`
- Storefront: `http://localhost:5173`
- Admin: `http://localhost:5174`

Set both frontend `VITE_API_BASE_URL` values to `http://localhost:4000`.

## Not yet integrated

- Live card/payment gateway: checkout creates `PENDING` orders.
- Direct image uploads: admin currently stores hosted image URLs.
- Transactional email and courier integrations.

These are isolated extension points and do not block catalog, auth, inventory, checkout, or order management.
