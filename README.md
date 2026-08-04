# Cosmic Tech E-commerce Platform

A production-oriented three-project monorepo:

- `apps/storefront` — customer React/Vite storefront
- `apps/admin` — isolated React/Vite commerce administration application
- `apps/backend` — Express, Prisma, and PostgreSQL API

## Core architecture

Customer and admin identities remain separate through different database models, routes, JWT signing secrets, middleware, and browser storage keys.

## Current operations

### Storefront

- Editorial Cosmic Tech design
- Technology categories and curated collections
- Product search, sorting, and filters for brand, compatibility, configuration, and finish
- Rich product pages with specifications, compatibility, warranty, box contents, and variants
- Cart and authenticated checkout
- Admin-enabled payment methods
- Backend-validated discount codes
- Order history, payment state, and shipment tracking

### Admin

- Separate admin authentication
- Catalog dashboard and inventory-risk metrics
- Rich technology product publishing
- Cloudinary image workflow when configured
- SKU/configuration inventory and movement ledger
- Categories and parent categories
- Curated collections
- Bulk product actions
- Discounts and eligibility targeting
- Payment-method availability and customer instructions
- Order, payment, and shipment management
- Superadmin account management

### Backend

- Node.js/Express and PostgreSQL through Prisma
- Separate customer/admin JWT secrets
- bcrypt, zod, Helmet, restricted CORS, and rate limiting
- Transactional price, discount, stock, and order calculation
- Product/configuration inventory movements
- Collections, categories, discounts, and safe payment settings
- Safepay, Cloudinary, and Resend integration points
- Additive Prisma migrations and idempotent technology seed

## Updating an existing deployment

Read `UPDATE_EXISTING_DEPLOYMENT.md`. Existing Vercel projects, domains, database, and environment variables are preserved.

## Feature reference

Read `TECH_COMMERCE_OPERATIONS.md` for the inventory, catalog, collection, discount, bulk-action, payment-method, and storefront behavior.

## Remaining future modules

- Returns/refund workflow
- Customer password reset and saved addresses
- Configurable shipping zones/services
- Tax rules
- Product reviews and wishlist
- Purchase orders/supplier management
- CSV catalog import/export
- Advanced analytics and audit logs
