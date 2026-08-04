# Complete E-commerce Vercel Package

A three-project e-commerce monorepo:

- `apps/storefront` — customer-facing React/Vite store
- `apps/admin` — separate React/Vite admin application and admin auth storage
- `apps/backend` — Express API deployed as a Vercel Function, PostgreSQL through Prisma

## Identity separation

The customer and admin identity systems are deliberately separate:

- Separate `User` and `Admin` database models
- Separate login routes
- Separate JWT signing secrets
- Token payloads carry a required identity kind (`customer` or `admin`)
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
- Safepay hosted checkout with server-side price and shipping calculation
- Verified Safepay webhook payment confirmation
- Payment success/cancellation states
- Customer order history with payment polling and shipment tracking
- Responsive SPA routing for Vercel

### Admin

- Separate admin login
- Dashboard metrics
- Products: create, edit, deactivate
- Signed Cloudinary image uploads, previews, removal, and gallery ordering
- Hosted image URL fallback
- Size/color/SKU/price/stock variant matrix and variant image selection
- Categories: create and delete
- Orders: view/filter, payment state, shipment details, tracking, and valid transitions
- Superadmin account creation
- Responsive SPA routing for Vercel

### Backend

- Express + PostgreSQL + Prisma
- Separate customer/admin JWT secrets
- bcrypt password hashing
- zod validation on every write route
- Helmet, restricted CORS, general and auth rate limits
- Transactional server-side price calculation and inventory decrement
- Safepay checkout initialization and HMAC-verified, idempotent webhooks
- Cloudinary signed-upload and media-registry endpoints
- Resend order, payment, shipping, delivery, and cancellation emails
- Carrier, tracking number/URL, ETA, and fulfilment timestamps
- Variant-level stock enforcement
- Stock restoration when an eligible order is cancelled
- Soft product deactivation
- Prisma migrations and idempotent seed
- Six sample fashion products and four categories

## Important unresolved credential risk

Audit item 1 was deliberately not changed in this sprint. The legacy seed/reset scripts still fall back to:

```text
admin@store.com
Admin@12345
```

Those values also remain in legacy documentation files. They are not production-safe. Ensure `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are configured, rotate the deployed admin password, and schedule the fail-fast credential patch separately.

## Deployment

Follow:

- `DEPLOY_TO_VERCEL.md` for the three Vercel projects
- `LAUNCH_SPRINT_SETUP.md` for Cloudinary, Safepay, Resend, shipping, migration, and end-to-end testing
- `LAUNCH_SPRINT_CHANGELOG.md` for the implementation summary

The same GitHub repository is imported into Vercel three times, each with a different Root Directory.

## Local setup

Install each app:

```bash
npm --prefix apps/backend install
npm --prefix apps/storefront install
npm --prefix apps/admin install
```

Copy environment files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/storefront/.env.example apps/storefront/.env
cp apps/admin/.env.example apps/admin/.env
```

Create a PostgreSQL database and put its pooled URL in `apps/backend/.env`.

Generate JWT secrets:

```bash
npm run generate:secrets
```

Migrate and seed:

```bash
npm --prefix apps/backend run db:deploy
npm --prefix apps/backend run db:seed
```

Start each app in a separate terminal:

```bash
npm run dev:backend
npm run dev:storefront
npm run dev:admin
```

Local defaults:

- Backend: `http://localhost:4000`
- Storefront: `http://localhost:5173`
- Admin: `http://localhost:5174`

Set both frontend `VITE_API_BASE_URL` values to `http://localhost:4000` for local development.

## Still not included

- Returns/refund management and provider refund initiation
- Coupons and tax rules
- Multiple shipping services/rates
- Customer password reset
- Automatic expiry/release of abandoned payment reservations
- Reopening an existing pending checkout after the hosted session is cancelled or expires
