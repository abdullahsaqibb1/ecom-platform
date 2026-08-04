# Cosmic Tech E-commerce Backend

Express API for Vercel with Prisma/PostgreSQL, isolated customer/admin authentication, transactional inventory, collections, discounts, payment methods, Safepay checkout, Cloudinary media, shipment tracking, transactional email, financial reporting, order-deletion auditing, and storefront content management.

## Main commands

```bash
npm install
npm run dev
npm run db:deploy
npm run db:seed
npm run db:reset-admin
```

`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are required. The seed and reset scripts do not use public fallback credentials.

## Public/customer routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/categories`
- `GET /api/collections`
- `GET /api/collections/:slug`
- `GET /api/products`
- `GET /api/products/:idOrSlug`
- `GET /api/payment-methods`
- `GET /api/storefront/config`
- `GET /api/content-pages/:slug`
- `POST /api/discounts/validate`
- `POST /api/orders`
- `GET /api/orders`

## Payment webhook

- `POST /api/webhooks/safepay`

The webhook verifies the provider signature, validates the order and amount, records a unique payment event, and is the only route allowed to confirm a Safepay payment.

## Main admin routes

- `POST /api/admin/auth/login`
- `GET /api/admin/me`
- `GET /api/admin/dashboard?range=30d`
- `GET|PUT /api/admin/storefront`
- `GET|POST /api/admin/content-pages`
- `PUT|PATCH|DELETE /api/admin/content-pages/:id`
- `GET|POST /api/admin/products`
- `PUT|PATCH|DELETE /api/admin/products/:id`
- `DELETE /api/admin/products/:id/permanent` — superadmin
- `POST /api/admin/products/bulk`
- `GET|POST /api/admin/categories`
- `GET|POST /api/admin/collections`
- `GET /api/admin/inventory`
- `POST /api/admin/inventory/adjust`
- `GET|POST /api/admin/discounts`
- `GET|POST /api/admin/payment-methods`
- `GET /api/admin/orders`
- `DELETE /api/admin/orders/:id` — superadmin, reason required
- `GET /api/admin/orders/deleted` — superadmin audit history
- `PATCH /api/admin/orders/:id/payment`
- `PATCH /api/admin/orders/:id/shipment`
- `PATCH /api/admin/orders/:id/status`
- `POST /api/admin/uploads/signature`
- `GET|POST /api/admin/media`
- `GET|POST /api/admin/admins` — superadmin

## Finance definitions

New orders snapshot the product/configuration purchase cost into `OrderItem.unitCost`. The dashboard reports paid revenue, COGS, gross product profit, inventory investment, inventory retail value, daily performance, and product profitability.

See the root `ADMIN_FINANCE_CMS.md` for definitions, limitations, deletion behavior, and Storefront Studio details.
