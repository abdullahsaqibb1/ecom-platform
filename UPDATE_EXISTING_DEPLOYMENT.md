# Update the Existing Cosmic Tech Deployment

Do not create new Vercel projects. Keep the existing:

- `ecom-backend`
- `ecom-admin`
- `ecom-storefront`
- PostgreSQL/Neon database
- `cosmictech.digital`
- `admin.cosmictech.digital`
- Existing environment variables and admin account

## GitHub web update

1. Extract the patch ZIP.
2. Open the existing `abdullahsaqibb1/ecom-platform` repository.
3. Stay at the repository root.
4. Select **Add file → Upload files**.
5. Drag the `apps` folder and the included documentation files from the extracted patch into GitHub.
6. Confirm paths begin with `apps/backend`, `apps/admin`, or `apps/storefront` and not with the patch-folder name.
7. Commit directly to `main` using:

   `Add Cosmic Tech commerce operations`

GitHub will replace changed paths and add the new migration/routes/pages.

## Delete the old credential document

The new seed and reset scripts fail safely when required admin variables are missing. In the existing GitHub repository, manually delete `ADMIN_CREDENTIALS.txt` because uploading a patch cannot remove an existing file:

1. Open `ADMIN_CREDENTIALS.txt` on GitHub.
2. Use the trash/delete-file action.
3. Commit the deletion to `main`.

Also keep real admin credentials only in Vercel environment variables.

## Vercel behavior

The same GitHub commit should trigger the existing three Vercel projects. No domain, root-directory, database, or API URL setup needs to be repeated.

The backend deployment runs:

```text
prisma generate
prisma migrate deploy
prisma db seed
```

The migration is additive. The seed does not overwrite existing products, admins, payment settings, or categories that already exist under the same unique values.

## Existing variables

Keep all existing variables. No new provider key is required for the core inventory, collection, discount, bulk-action, or manual payment-method features.

Safepay, Cloudinary, and Resend can remain unconfigured for now. The Payment Methods page reports whether an online provider is ready. Cash on delivery remains available as a safe fallback after the seed.

## Verification

After all deployments show **Ready**:

1. Open `https://admin.cosmictech.digital`.
2. Confirm navigation includes Inventory, Collections, Discounts, and Payment Methods.
3. Create or edit a product and verify brand, model, compatibility, specifications, cost, threshold, collections, and configurations save.
4. Open Inventory, adjust one SKU, and confirm a movement appears in the ledger.
5. Select multiple products and test adding them to a collection.
6. Create a test discount and validate it at storefront checkout.
7. Enable or disable Cash on Delivery and verify checkout updates.
8. Open a storefront collection and verify brand/compatibility/configuration filters.

If the backend deployment fails, open its build log and locate the `prisma migrate deploy` output before redeploying the frontend projects.
