# Architecture

```text
Customer browser
  -> Storefront Vercel project
  -> /api public and customer endpoints

Admin browser
  -> Admin Vercel project
  -> /api/admin endpoints only

Both frontends
  -> Express API Vercel project
  -> Prisma ORM
  -> Managed PostgreSQL
```

## Authentication boundary

### Customer

- Model: `User`
- Login: `POST /api/auth/login`
- Token secret: `JWT_CUSTOMER_SECRET`
- Token claim: `kind=customer`
- Browser key: `ecom.customer.accessToken`

### Admin

- Model: `Admin`
- Login: `POST /api/admin/auth/login`
- Token secret: `JWT_ADMIN_SECRET`
- Token claim: `kind=admin`
- Browser key: `ecom.admin.accessToken`

Middleware verifies both the correct signing secret and token kind.

## Order transaction

1. Validate request with zod.
2. Load active products and requested variants.
3. Resolve authoritative database prices.
4. Confirm variant or product inventory.
5. Decrement inventory atomically.
6. Create order and price snapshots inside the same serializable transaction.
7. Return the created `PENDING` order.

Admin cancellation restores inventory for orders that have not shipped.
