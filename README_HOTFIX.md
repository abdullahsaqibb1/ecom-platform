# Cosmic Tech order-validation hotfix

This patch fixes the common checkout `Validation failed` error caused by stale preview/demo products in browser cart storage.

Changes:
- Demo catalog fallback now defaults to OFF unless `VITE_ENABLE_DEMO_FALLBACK=true` is explicitly configured.
- Old preview cart entries with non-UUID product/configuration IDs are removed in production.
- Checkout blocks preview IDs with a clear recovery action instead of sending an invalid order payload.
- API validation responses now show the rejected field(s), rather than only `Validation failed.`

Upload the contents of this patch to the root of the existing GitHub repository and commit to `main`.

Also verify the `ecom-storefront` Vercel variable is:

`VITE_ENABLE_DEMO_FALLBACK=false`
