# Cosmic Tech — Storefront Typography Studio

This patch adds typography control to the existing **Admin → Storefront studio** without replacing the current Vercel projects, domains, database, products, customers, or authentication setup.

## What is added

- New **Typography** tab in Storefront Studio.
- Six one-click presets:
  - Cosmic Editorial — Italiana + DM Sans
  - Modern Luxury — Cormorant Garamond + Manrope
  - Fashion Magazine — Bodoni Moda + DM Sans
  - Clean Commerce — Playfair Display + Inter
  - Minimal Tech — DM Serif Display + Plus Jakarta Sans
  - Modern Sans — Manrope throughout
- Separate font roles for:
  - Display / headings
  - Body copy
  - Navigation
  - Buttons
  - Labels / eyebrows
- Curated font library with 18 Google Fonts.
- Per-role font weight controls: 400 / 500 / 600 / 700.
- Per-role letter-spacing controls.
- Live typography preview inside the admin before publishing.
- Storefront typography is applied through CSS variables, so all pages update after publishing.

## Database change

Additive migration:

`202608210001_storefront_typography`

It adds an optional JSONB `typography` field to `StorefrontSettings`. Existing rows are not deleted or rewritten. Until typography is published, the storefront falls back to the existing Cosmic Editorial typography.

## Deploy to the existing repository

1. Extract `cosmic-tech-typography-studio-patch.zip`.
2. Open the existing `abdullahsaqibb1/ecom-platform` repository at its root in GitHub.
3. Choose **Add file → Upload files**.
4. Drag the `apps` folder and `TYPOGRAPHY_STUDIO.md` from this patch into GitHub.
5. Confirm the paths begin with `apps/backend`, `apps/admin`, and `apps/storefront`. Do not create an extra nested patch folder.
6. Commit directly to `main` with:

   `Add storefront typography controls`

Vercel will redeploy the existing backend, admin, and storefront projects.

## Deployment order / verification

1. Confirm `ecom-backend` becomes **Ready** and the build log shows migration `202608210001_storefront_typography` applied.
2. Confirm `https://api.cosmictech.digital/health` still reports `database: connected`.
3. Confirm `ecom-admin` becomes **Ready**.
4. Open `https://admin.cosmictech.digital` → **Storefront studio → Typography**.
5. Choose a preset, review the live preview, and click **Publish changes**.
6. Open `https://www.cosmictech.digital` and hard refresh. Headings, body, navigation, buttons, and labels should reflect the selected roles.

## Environment variables

No new Vercel environment variables are required.

## Rollback behavior

Because the database column is optional and the frontend has defaults, an unset typography record uses the existing Italiana + DM Sans storefront style.
