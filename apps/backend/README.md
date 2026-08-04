# E-commerce Backend

Express API for Vercel with Prisma/PostgreSQL, separate customer/admin authentication, Safepay checkout, Cloudinary media uploads, shipment tracking, and Resend transactional email.

## Main commands

```bash
npm install
npm run dev
npm run db:deploy
npm run db:seed
npm run db:reset-admin
```

## Public/customer routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:idOrSlug`
- `POST /api/orders`
- `GET /api/orders`

## Payment webhook

- `POST /api/webhooks/safepay`

This route verifies `X-SFPY-SIGNATURE`, validates payment amount/currency/order ownership, persists a unique provider event, and is the only route allowed to confirm payment.

## Admin routes

- `POST /api/admin/auth/login`
- `GET /api/admin/me`
- `GET|POST /api/admin/admins` (superadmin)
- `GET|POST /api/admin/categories`
- `DELETE /api/admin/categories/:id`
- `GET|POST /api/admin/products`
- `PUT|PATCH|DELETE /api/admin/products/:id`
- `POST /api/admin/uploads/signature`
- `GET|POST /api/admin/media`
- `DELETE /api/admin/media/:id`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/shipment`
- `PATCH /api/admin/orders/:id/status`

## Provider configuration

See the root `LAUNCH_SPRINT_SETUP.md` for the exact Vercel variables and setup order for Cloudinary, Safepay, Resend, CORS, shipping, and the database migration.

## Known security task outside this sprint

The legacy hardcoded fallback credentials in `prisma/seed.js` and `prisma/reset-admin.js` remain unchanged because the requested sprint started at audit item 2. Do not treat the documented fallback password as production-safe.
