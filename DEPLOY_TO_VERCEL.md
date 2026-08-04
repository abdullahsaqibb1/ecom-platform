# Deploy All Three Applications on Vercel

Use one GitHub repository and create three Vercel projects from it.

Current intended domains:

```text
Storefront: https://cosmictech.digital
Admin:      https://admin.cosmictech.digital
Backend:    https://ecom-backend-nine-blush.vercel.app
```

## 1. Upload/update the GitHub repository

Extract this package and replace the repository contents while preserving the root structure:

```text
apps/admin
apps/backend
apps/storefront
```

Commit and push to `main`. Do not commit real `.env` files or provider secrets.

## 2. PostgreSQL

Use the existing managed PostgreSQL/Neon database. The backend Vercel project must retain its pooled `DATABASE_URL`.

The updated backend build applies both the launch migration and the additive Cosmic Tech operations migration automatically:

```text
prisma generate
prisma migrate deploy
prisma db seed
```

## 3. Backend Vercel project

Use:

```text
Project: ecom-backend
Root Directory: apps/backend
Framework Preset: Express or Other
Install Command: npm install
Build Command: npm run vercel-build
Output Directory: empty / N/A
```

### Existing backend variables

```env
DATABASE_URL=your-existing-pooled-postgresql-url
JWT_CUSTOMER_SECRET=your-existing-customer-secret
JWT_ADMIN_SECRET=your-existing-different-admin-secret
JWT_CUSTOMER_EXPIRES_IN=7d
JWT_ADMIN_EXPIRES_IN=8h
CUSTOMER_ORIGINS=https://cosmictech.digital,https://www.cosmictech.digital,https://ecom-storefront-smoky.vercel.app
ADMIN_ORIGINS=https://admin.cosmictech.digital,https://your-admin-vercel-domain.vercel.app
SEED_ADMIN_NAME=your-existing-admin-name
SEED_ADMIN_EMAIL=your-existing-admin-email
SEED_ADMIN_PASSWORD=your-existing-admin-password
```

### New commerce variables

```env
PAYMENT_PROVIDER=safepay
SAFEPAY_ENVIRONMENT=sandbox
SAFEPAY_SECRET_KEY=your-safepay-sandbox-secret-key
SAFEPAY_API_KEY=your-safepay-sandbox-api-key
SAFEPAY_INTENT=CYBERSOURCE
SAFEPAY_WEBHOOK_SECRET=your-safepay-endpoint-secret
SAFEPAY_WEBHOOK_SECRET_PREVIOUS=

STOREFRONT_URL=https://cosmictech.digital
FREE_SHIPPING_THRESHOLD=2500
FLAT_SHIPPING_RATE=300

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_FOLDER=cosmictech/products

RESEND_API_KEY=re_your_key
EMAIL_FROM=Cosmic Tech <orders@updates.cosmictech.digital>
STORE_NAME=Cosmic Tech
SUPPORT_EMAIL=support@cosmictech.digital
```

Generate secure JWT values locally, when needed, with:

```bash
node scripts/generate-secrets.js
```

After deployment, verify:

```text
https://ecom-backend-nine-blush.vercel.app/health
```

## 4. Safepay webhook

In the matching Safepay sandbox account, create the endpoint:

```text
https://ecom-backend-nine-blush.vercel.app/api/webhooks/safepay
```

Subscribe to:

```text
payment.succeeded
payment.failed
payment.refunded
```

Copy the webhook signing/shared secret into `SAFEPAY_WEBHOOK_SECRET`, then redeploy the backend.

## 5. Admin Vercel project

Use:

```text
Project: ecom-admin
Root Directory: apps/admin
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Variables:

```env
VITE_API_BASE_URL=https://ecom-backend-nine-blush.vercel.app
VITE_CURRENCY=PKR
```

The custom domain remains:

```text
https://admin.cosmictech.digital
```

Redeploy this project after the code push to activate inventory, collections, discounts, bulk catalog actions, payment settings, image uploads and shipment management.

## 6. Storefront Vercel project

Use:

```text
Project: ecom-storefront
Root Directory: apps/storefront
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Variables:

```env
VITE_API_BASE_URL=https://ecom-backend-nine-blush.vercel.app
VITE_ENABLE_DEMO_FALLBACK=false
VITE_STORE_NAME=Cosmic Tech
VITE_CURRENCY=PKR
VITE_FREE_SHIPPING_THRESHOLD=2500
VITE_FLAT_SHIPPING_RATE=300
```

The custom domain remains:

```text
https://cosmictech.digital
```

## 7. Resend and Hostinger DNS

Add and verify a sending subdomain such as:

```text
updates.cosmictech.digital
```

Copy the exact SPF/DKIM DNS records from Resend into Hostinger. Once verified, ensure `EMAIL_FROM` uses that domain and redeploy the backend.

## 8. Cloudinary

No frontend Cloudinary variables are required. All Cloudinary credentials remain on `ecom-backend`; the authenticated admin receives only a short-lived upload signature plus the public cloud name/API key.

## 9. Commerce operations verification

After deployment, verify the new admin navigation includes Products, Inventory, Categories, Collections, Discounts, Payment Methods, Orders and Admin Accounts. Inventory, collections, discounts and manual payment settings do not require any new provider secrets.

## 10. Verification sequence

1. Backend `/health` reports `database: connected`.
2. Admin login succeeds.
3. Upload an image in Admin → Products and save the product.
4. Confirm the image renders on the storefront.
5. Create a customer and place a Safepay sandbox order.
6. Confirm the order starts with `paymentStatus=PROCESSING`.
7. Confirm a verified `payment.succeeded` webhook changes it to `PAID`.
8. Enter carrier/tracking details in the admin and mark it shipped.
9. Confirm customer tracking information and Resend email logs.
10. Mark the order delivered and confirm the delivery email.

## Security notes

- Use different customer/admin JWT secrets.
- Never add backend secrets to a variable beginning with `VITE_`.
- Do not commit `.env` files.
- The seed and reset scripts now require `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` and fail safely when either is missing. Remove any old credential documentation from the existing repository history and rotate exposed credentials.
