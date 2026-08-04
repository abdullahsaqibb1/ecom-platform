# Launch Sprint Changelog

Original scope: audit items 2–6. A later security follow-up removed the hardcoded seed/reset credential fallback; the scripts now require environment variables.

## Backend

- Added Safepay hosted checkout initialization for PKR orders.
- Added server-only Safepay secret/API key configuration and channel selection (`CYBERSOURCE` or `MPGS`).
- Added raw-body HMAC-SHA512 webhook verification with optional previous-secret rotation support.
- Added validation of webhook merchant key, order reference, tracker, currency, and charged amount.
- Added idempotent `PaymentEvent` persistence to prevent duplicate webhook processing.
- Added `PaymentStatus`, provider references, subtotal, shipping total, and payment/fulfilment timestamps to orders.
- Added signed Cloudinary upload-signature endpoint and PostgreSQL media registry.
- Added Cloudinary deletion protection while an asset is still referenced by a product/variant.
- Added admin shipment endpoint with carrier, tracking number, tracking URL, and ETA.
- Added Resend transactional email service and idempotent notification logs.
- Removed the ability for an admin UI/API status request to mark an order paid; Safepay webhooks control payment confirmation.
- Moved shipping-price authority to the server.

## Admin

- Added multi-file product-image upload from the product editor.
- Added image previews, hosted-URL fallback, removal, and gallery ordering.
- Added variant-image selection from uploaded product images.
- Fixed empty variant IDs being submitted to strict backend UUID validation.
- Added payment status, provider reference, and paid timestamp to order details.
- Added shipment/tracking form for paid orders and update support for shipped orders.
- Added direct tracking link and fulfilment actions.

## Storefront

- Added Safepay redirect checkout using the server-calculated order total.
- Added payment-success and payment-cancelled pages.
- Added payment-state polling in the customer account while a payment is processing.
- Added shipment carrier, tracking number, ETA, and tracking link to order history.
- Added configurable shipping-display variables aligned with backend pricing.

## Database

- Added `PaymentEvent`, `NotificationLog`, and `MediaAsset` models.
- Added order payment, shipment, and timestamp fields.
- Added indexes for payment state, tracking number, notification status, and provider event idempotency.
