# Update the Existing Vercel Deployment

You do **not** need to create new Vercel projects, reconnect domains, recreate the database, or re-enter existing environment variables.

This patch contains only files added or changed by the launch-commerce sprint.

## Apply the patch

1. Open the existing `ecom-platform` repository on your computer.
2. Extract this ZIP.
3. Drag the extracted `apps`, `scripts`, and root files into the existing repository folder.
4. Choose **Replace/Merge** when macOS asks. Do not delete the existing repository first.
5. Commit and push the changes to the existing `main` branch.
6. Vercel will redeploy the existing `ecom-backend`, `ecom-admin`, and `ecom-storefront` projects from the same repository.

Your existing settings remain attached to the Vercel projects:

- Custom domains
- Database connection
- Existing admin account
- JWT secrets
- Current project URLs
- Existing environment variables

## Add only the new backend variables

Add these under `ecom-backend` → Settings → Environment Variables:

```env
PAYMENT_PROVIDER=safepay
SAFEPAY_ENVIRONMENT=sandbox
SAFEPAY_SECRET_KEY=
SAFEPAY_API_KEY=
SAFEPAY_INTENT=CYBERSOURCE
SAFEPAY_WEBHOOK_SECRET=
STOREFRONT_URL=https://cosmictech.digital
FREE_SHIPPING_THRESHOLD=2500
FLAT_SHIPPING_RATE=300
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=cosmictech/products
RESEND_API_KEY=
EMAIL_FROM=Cosmic Tech <orders@updates.cosmictech.digital>
STORE_NAME=Cosmic Tech
SUPPORT_EMAIL=support@cosmictech.digital
```

Keep all existing backend variables such as `DATABASE_URL`, JWT secrets, CORS origins, and seed-admin settings.

## Add only the new storefront variables

Add these under `ecom-storefront` → Settings → Environment Variables:

```env
VITE_FREE_SHIPPING_THRESHOLD=2500
VITE_FLAT_SHIPPING_RATE=300
```

Keep the existing `VITE_API_BASE_URL`, store name, currency, and demo-fallback variables.

## Database migration

The existing backend build command runs:

```text
prisma generate && prisma migrate deploy && prisma db seed
```

The new migration updates the same connected database. It adds payment, shipment, media, and notification tables/fields without deleting existing customers, products, orders, or admins.

The seed script does not reset the current admin password when the admin already exists.

## Deployment order

1. Push the patch to GitHub.
2. Add the new environment variables.
3. Redeploy `ecom-backend` after the variables are saved.
4. Confirm `/health` still reports `database: connected`.
5. Test Cloudinary uploads in the admin product form.
6. Configure the Safepay webhook.
7. Verify the Resend sending domain.
