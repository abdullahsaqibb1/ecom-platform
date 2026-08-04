# Architecture

```text
Customer browser
  -> Storefront Vercel project
  -> public/customer API endpoints
  -> Safepay hosted checkout

Admin browser
  -> Admin Vercel project
  -> admin API endpoints only
  -> signed direct image upload to Cloudinary

Safepay
  -> signed webhook to Express API

Express API Vercel project
  -> Prisma ORM
  -> Managed PostgreSQL
  -> Cloudinary signature/delete API
  -> Resend Email API
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

## Order and payment transaction

1. Validate checkout request with zod.
2. Load active products and requested variants.
3. Resolve authoritative database prices.
4. Confirm product/variant inventory.
5. Decrement inventory atomically.
6. Calculate server-side shipping.
7. Create order and line-item price snapshots inside the same serializable transaction.
8. Request a Safepay tracker and hosted checkout URL.
9. Redirect the customer to Safepay.
10. Display redirect result as pending confirmation only.
11. Verify Safepay's webhook HMAC against the raw request body.
12. Validate merchant key, tracker/order, PKR currency, and charged amount.
13. Persist a unique `PaymentEvent` and mark the order paid idempotently.
14. Send the payment-confirmed email once.

If Safepay checkout initialization fails, the order is cancelled and reserved inventory is restored.

## Media flow

1. Authenticated admin requests an upload signature.
2. Backend signs timestamp and folder using the Cloudinary API secret.
3. Browser uploads directly to Cloudinary with the signature.
4. Admin registers the returned asset metadata in PostgreSQL.
5. Product and variant records reference the secure delivery URL.

The Cloudinary API secret never enters the browser bundle.

## Fulfilment flow

1. A paid order is visible in Admin → Orders.
2. Admin supplies carrier, tracking number, optional tracking URL, and ETA.
3. Backend changes the order to `SHIPPED` and records `shippedAt`.
4. A shipping email is sent once through Resend.
5. Admin marks the shipped order delivered.
6. Backend records `deliveredAt` and sends the delivered email once.

## Idempotency

- `PaymentEvent(provider,eventId)` is unique, preventing duplicate webhook state changes.
- `NotificationLog(orderId,type)` is unique, preventing duplicate emails for each order event.

## Catalog and merchandising model

- `Category` is the product taxonomy and supports parent/child structure.
- `Collection` is a curated merchandising entity.
- `CollectionProduct` is the many-to-many membership and ordering table.
- `Product` stores shared technical identity, specifications, compatibility, pricing and aggregate stock.
- `ProductVariant` stores sellable configurations/SKUs, configuration price/cost and stock.

## Inventory transaction model

- A completed order allocation decrements the selected configuration and aggregate product stock in the same serializable order transaction.
- Every sale creates `InventoryMovement` records.
- Cancellation restores both levels and writes cancellation movements.
- Admin adjustments reject negative resulting stock and record admin, reason, type, reference and resulting quantity.
- Product-editor stock changes also create ledger entries.

## Discount model

Discount eligibility, scope, amount, usage limits and per-customer limits are evaluated inside the backend transaction. Product, category and collection targeting is resolved against authoritative database membership. The storefront only displays the returned calculation.

## Payment-method boundary

The database stores safe operational settings such as display name, instructions, order, enabled state and non-secret configuration. Provider credentials remain in backend environment variables. Public checkout only receives enabled methods whose provider environment is ready.
