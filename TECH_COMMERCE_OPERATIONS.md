# Cosmic Tech Commerce Operations

This update turns the existing generic catalog into a technology-focused commerce operations system without replacing the current Vercel projects, domains, database, or customer/admin identity separation.

## Product publishing

Each product can now control:

- Draft, active, or archived status
- Featured placement
- Category and multiple collections
- Brand, model, barcode, condition, and warranty duration
- Selling price, compare-at price, and private cost price
- Product-level and configuration-level low-stock thresholds
- Compatibility lists
- Structured technical specifications
- Highlights and box contents
- Tags and search metadata
- Up to 20 images with Cloudinary upload support
- Configuration-level SKU, barcode, connector/length/wattage/capacity label, finish, price override, cost, stock, compatibility, technical specifications, and image

The existing internal `size` field remains in the database for migration compatibility but is presented throughout the interfaces as **Configuration**.

## Inventory

The inventory workspace includes:

- Aggregate product stock
- Configuration/SKU-level stock
- Configurable low-stock thresholds
- Low-stock and out-of-stock filtering
- Restock, correction, return, and damage/write-off adjustments
- Negative-stock prevention
- A permanent inventory movement ledger
- Automatic sale deductions
- Automatic restoration when an eligible order is cancelled
- Admin identity, reason, reference, quantity change, and resulting stock on every manual movement

Products with configurations require configuration-level adjustments; the aggregate product quantity is updated automatically.

## Categories and collections

Categories describe what an item is, such as Chargers, Cables, or Earbuds. Categories support:

- Description and image
- Active/inactive state
- Sort order
- Parent/child category structure

Collections are merchandising groups independent of category, such as:

- New Arrivals
- Best Sellers
- Fast Charging
- iPhone Essentials
- Travel Tech

Products can belong to one category and multiple collections. Collection order is stored for future merchandising controls.

## Bulk catalog operations

The Products page supports selecting all visible products or individual listings, then applying:

- Publish/activate
- Move to draft
- Archive
- Mark as featured or remove featured status
- Move to a category or remove category assignment
- Add to a collection
- Remove from a collection
- Set a low-stock threshold
- Permanently delete

Permanent deletion is limited to superadmins and is blocked for products already referenced by orders. Archive should be used for historic products.

## Discounts

Admin users can create code-based discounts with:

- Percentage, fixed amount, or free shipping type
- All-product, product, category, or collection scope
- Minimum order amount
- Maximum discount cap
- Start and end dates
- Total usage limit
- Per-customer usage limit
- Active/inactive control

Discount prices and eligibility are always recalculated by the backend. The browser cannot set the discount total.

## Payment methods

The Payment Methods workspace controls:

- Checkout display name
- Customer description and instructions
- Enabled/disabled state
- Checkout order
- Manual/offline versus provider-confirmed behavior
- Provider readiness visibility

Provider secrets remain in Vercel environment variables and are never returned to the admin browser. Enabling Safepay in the admin does not expose it at checkout until the required backend credentials are configured.

Included seed methods:

- Cash on delivery
- Bank transfer
- Safepay

## Storefront changes

The storefront now reads:

- Categories and curated collections
- Dynamic brand, compatibility, configuration, and finish filters
- Structured specifications
- Brand/model, condition, warranty, barcode, highlights, and box contents
- Admin-enabled payment methods
- Backend-validated discount codes
- Customer order notes

The editorial palette and typography remain unchanged.

## Database safety

Migration `202608040002_tech_commerce_operations` is additive. It does not drop existing customers, admins, products, orders, media, payment events, or notifications.

The migration adds new columns and tables for operations. Existing product active states are mapped to the new status field.

## Finance and storefront administration extension

The subsequent admin-finance/CMS extension adds purchase-cost snapshots, paid-sales profitability, current inventory investment, superadmin order deletion with retained audit snapshots, permanent product cleanup after references are removed, and a Storefront Studio for brand, navigation, homepage, footer, images, palette, and information pages.

See `ADMIN_FINANCE_CMS.md` for definitions and operational warnings.
