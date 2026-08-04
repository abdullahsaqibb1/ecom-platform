# Cosmic Tech — Admin Finance, Order Cleanup, and Storefront Studio

This update extends the existing commerce-operations release without replacing the current Vercel projects, PostgreSQL database, domains, products, customers, or admin account.

## Order deletion and product cleanup

A `SUPERADMIN` can permanently delete an order from the Orders workspace after entering a reason.

The backend:

- Saves an audit snapshot in `OrderDeletionLog` before deletion.
- Deletes the order items, payment-event records, and notification records through existing cascade rules.
- Restores inventory for `PENDING` and paid-but-not-shipped (`PAID`) orders.
- Does not restore stock for shipped or delivered sales.
- Does not initiate a Safepay or other provider refund. Provider refunds must be handled separately before deleting a paid real order.

Once all order references to a product are removed, a `SUPERADMIN` can permanently delete that product. Otherwise the product should remain archived.

## Financial reporting

The Overview dashboard now reports:

- Paid order revenue
- Product revenue after order-level discounts
- Shipping revenue
- Current stock investment at purchase cost
- Realized cost of goods sold (COGS)
- Gross product profit and gross margin
- Average paid order value
- Current inventory retail value
- Potential inventory margin
- Daily revenue-versus-cost timeline
- Top products by realized gross profit

### Cost behavior

`Product.costPrice` and `ProductVariant.costPrice` are the purchase costs entered by the administrator. When an order is placed, the applicable cost is copied to `OrderItem.unitCost`. This preserves the historical purchase cost even if the product cost is changed later.

Existing historical order items are backfilled during migration from the current variant cost, then the current product cost. Therefore, figures for orders created before this update are estimates when purchase costs changed after those orders were placed.

The dashboard warns when stocked or sold units do not have purchase cost data. Missing costs are treated as zero until they are entered, so profit should not be treated as final while the warning is visible.

Gross profit excludes courier expense, payment-provider fees, taxes, returns, refunds, overhead, and other operating expenses because those actual costs are not yet stored.

## Storefront Studio

The new **Storefront Studio** section controls live storefront content without editing React files.

### Brand and header

- Site name
- Logo and logo alt text
- Browser favicon
- Support email and phone
- Announcement bar and optional link
- Header navigation labels, URLs, visibility, and order
- Core editorial palette colors

### Homepage

- Hero eyebrow, heading, copy, CTA, and URL
- Animated-earbuds hero or uploaded hero image
- Product rows driven by collection slug
- Product count per row
- Editorial category panels and images
- Brand statement and CTA
- Category mosaic images, labels, and destinations

### Footer

- Newsletter text
- Brand description
- Support information
- Footer columns and links
- Legal links

### Information pages

Administrators can create and edit customer-facing pages such as About, Shipping, Returns, Compatibility, Contact, Privacy, and Terms, including:

- Page title and slug
- Eyebrow
- Main body content
- Hero image
- Published/draft state
- Sort order
- SEO title and description

Page deletion is restricted to `SUPERADMIN`.

## Editorial admin redesign

The admin application now uses the same visual language as the storefront:

- DM Sans and Italiana typography
- Off-white, warm beige, charcoal, and muted neutral palette
- Thin borders and restrained shadows
- Flat, editorial panels instead of rounded gradient cards
- Store logo and site name in the sidebar

The customer and admin authentication systems remain separate.
