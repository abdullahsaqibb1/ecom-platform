# Cosmic Tech — External Sales, CSV Export, Reviews & Guest Checkout

This is an in-place update for the existing Cosmic Tech monorepo and Vercel projects. It does not replace the database, domains, authentication system, inventory, products, existing orders, Storefront Studio, or the typography controls.

## What this update adds

### 1. External / manual orders

Admin → Orders now includes **Add external sale**.

An administrator can record sales made through:

- WhatsApp
- Phone
- Instagram
- Facebook
- Walk-in
- Marketplace
- Manual / other

The form supports customer/contact details, source reference, product/configuration selection, quantity, actual selling price, payment method/state, shipping charge, discount, completion state, delivery details, internal note, and optional order-confirmation email.

Manual orders use the **same Product and ProductVariant stock** as website checkout. Inventory is allocated inside a serializable PostgreSQL transaction and stock cannot go below zero. Each sale creates InventoryMovement entries and appears in Orders, financial reporting, product sales metrics, and CSV exports.

Paid external sales contribute to revenue/COGS/gross-profit reporting using the same OrderItem purchase-cost snapshot behavior as website orders.

### 2. Order source metadata

The additive `OrderSource` enum is:

- WEBSITE
- MANUAL
- PHONE
- WHATSAPP
- INSTAGRAM
- FACEBOOK
- WALK_IN
- MARKETPLACE
- OTHER

Orders can also record `sourceNote`, `customerEmail`, `customerPhone`, and `createdByAdminId`.

### 3. CSV order export

Admin → Orders now includes **Export CSV**. The export respects the current status and source filters and writes one row per order item so order and line-item data can be analyzed in Excel, Google Sheets, accounting tools, or BI software.

Exported business fields include order/source/status/payment/discount/tax/totals, customer/contact details, decrypted shipping fields, shipment/tracking timestamps, creator-admin metadata, product/variant/SKU/configuration, quantities, sale prices, purchase costs, and line totals/costs.

Security-only/internal implementation fields such as the encrypted shipping blob and provider checkout tracker are deliberately excluded. The normal payment reference is included.

### 4. Product reviews

Every product page now has a Reviews section.

Customers and guests can submit:

- 1–5 star rating
- Name
- Email (private; not displayed publicly)
- Optional review title
- Review body

Website submissions start as **PENDING** and do not appear publicly until approved by an administrator.

If a signed-in customer has a paid, shipped, or delivered order containing that product, the review is marked **Verified purchase** automatically. The badge cannot be manually assigned from the admin UI.

Admin → Reviews supports:

- All / Pending / Approved / Rejected filtering
- Search
- Quick approve/reject
- Add store-entered review
- Edit/moderate review
- Feature review for future merchandising
- Private admin notes
- Permanent delete for SUPERADMIN

Store-entered reviews are labelled **Store-entered review** on the storefront. If staff changes the wording/rating/name of a customer-submitted website review, the system records `editedByAdminAt` and the storefront shows **Edited for clarity by store**.

Public review APIs never expose reviewer email or admin notes.

### 5. Guest checkout

A customer account is no longer required to place an order.

Checkout now asks for an email address directly and shows sign-in as optional. If a customer is already signed in, their email/name are prefilled and the order is linked to their account as before.

For guest orders:

- `Order.userId` is null.
- Customer email and phone are stored on the order.
- Inventory, pricing, discounts, shipping, payment method, and totals remain server-authoritative.
- Order confirmation/payment/shipping emails use `customerEmail`.
- Guest orders do not automatically appear in a customer account later merely because the same email address is used. A future order-claim/link flow can be added separately if desired.

Discount per-customer limits can use the guest checkout email when there is no authenticated customer ID.

## Database migration

New additive migration:

`202608210002_sales_reviews_guest_checkout`

It:

- makes `Order.userId` nullable
- adds order source/contact/admin-creator fields
- backfills `customerEmail` for existing account orders
- creates the Review table and review enums
- adds indexes and foreign keys
- enables RLS on Review consistent with the existing server-only Prisma security model

It does not delete existing records or drop existing business tables.

## Environment variables

**No new Vercel environment variables are required for these four features.**

Keep all existing backend, session, CORS, Cloudinary, payment, and Resend settings.

## Deployment

Upload this patch into the existing `abdullahsaqibb1/ecom-platform` repository at the repository root. Paths must remain under `apps/backend`, `apps/admin`, and `apps/storefront`; do not create a nested patch folder.

Suggested commit message:

`Add external sales, reviews, CSV export and guest checkout`

Vercel should deploy the existing projects automatically. Confirm **ecom-backend** first because its build runs `prisma migrate deploy`. After the backend is Ready, confirm **ecom-admin** and **ecom-storefront** are Ready.

## Recommended post-deploy test

1. Create a small external sale in Admin → Orders and verify stock decreases in Inventory.
2. Export Orders CSV and open it to confirm customer/order/item/cost columns.
3. Submit a review from a storefront product page while signed out; confirm it appears Pending in Admin → Reviews and not publicly yet.
4. Approve it and confirm it appears on the product page.
5. Place a website order in a private/incognito browser without signing in.
6. Confirm checkout succeeds and the order appears in Admin → Orders with source WEBSITE and guest email.
7. Place one signed-in order as a regression check and confirm it still appears in customer account history.
