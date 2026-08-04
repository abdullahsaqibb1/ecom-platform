# Update the Existing Cosmic Tech Deployment

This is an in-place update. Do not create new Vercel projects and do not reconnect the domains.

## Preserved automatically

- `ecom-backend`, `ecom-admin`, and `ecom-storefront` Vercel projects
- `cosmictech.digital` and `admin.cosmictech.digital`
- PostgreSQL database and existing records
- Existing users and administrators
- Existing environment variables and JWT secrets
- Existing products, inventory, categories, collections, discounts, and orders

## GitHub Web upload

1. Extract `cosmic-tech-admin-finance-cms-patch.zip`.
2. Open the existing `ecom-platform` GitHub repository at its root.
3. Choose **Add file → Upload files**.
4. Drag everything inside the extracted patch folder into GitHub.
5. Confirm paths begin with `apps/backend/`, `apps/admin/`, `apps/storefront/`, or the documentation filename.
6. Do not upload the outer patch folder as a nested directory.
7. Commit directly to `main` with:

   `Add admin finance reporting and storefront studio`

## Deployment order

Vercel should start deployments automatically.

### 1. Backend

Watch `ecom-backend` first. Its build must run:

- `prisma generate`
- `prisma migrate deploy`
- `prisma db seed`

The new additive migration is:

`202608040003_admin_finance_storefront_cms`

It adds:

- `OrderItem.unitCost`
- `StorefrontSettings`
- `ContentPage`
- `OrderDeletionLog`

It does not drop existing tables or records.

### 2. Admin

After the backend is Ready, verify the newest `ecom-admin` deployment is Ready. The sidebar should include **Storefront studio**, and the Overview page should show financial reporting.

### 3. Storefront

Verify the newest `ecom-storefront` deployment is Ready. The storefront will continue using the existing design until settings are published from Storefront Studio.

## Environment variables

No new environment variables are required for this update.

Keep the existing backend variables, especially:

- `DATABASE_URL`
- `JWT_CUSTOMER_SECRET`
- `JWT_ADMIN_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `ADMIN_ORIGINS`
- `CUSTOMER_ORIGINS`

Cloudinary must already be configured for dashboard image uploads. Without Cloudinary, administrators can still paste hosted image URLs into Storefront Studio.

## First-use checklist

1. Open `https://admin.cosmictech.digital`.
2. Open **Products** and enter purchase cost for products and configurations.
3. Open **Overview** and confirm the missing-cost warning decreases as costs are completed.
4. Open **Storefront studio** and review the current brand, navigation, homepage, footer, and content pages.
5. Upload the logo and favicon, then publish the storefront settings.
6. Open `https://cosmictech.digital` in a private browser window and verify the changes.
7. Test order deletion only with a test or duplicate order first.

## Important deletion warning

Deleting a paid order does not issue a payment-provider refund. Refund a real payment through the provider before deleting the order. An audit snapshot is retained, but the active order cannot be restored from the dashboard.

## Financial reporting limitations

Gross profit is product revenue after order-level discounts minus captured purchase cost. It does not yet include courier expense, payment fees, tax expense, refunds, returns, or overhead.

Costs for old orders are backfilled from the current cost at migration time and may be estimates. New orders preserve the purchase cost at the time of order placement.
