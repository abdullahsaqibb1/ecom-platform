# Cosmic Tech Editorial Storefront Patch

This patch keeps the original storefront's exact design system:

- DM Sans body typography
- Italiana display typography
- Off-white, black, grey and warm beige palette
- Original header, product-grid, split editorial, brand statement and footer layouts
- Original spacing, borders and restrained motion

It changes only the retail subject from fashion to technology:

- New / Audio / Charging / Cables / Power / Accessories navigation
- CSS-only opening earbuds-case hero animation within the existing editorial hero
- Tech-focused homepage imagery and copy
- Product-card metadata adapted for categories and specifications
- Product-page options renamed to Configuration and Finish
- Dynamic Configuration and Finish filters
- Compatibility guide replacing the size guide
- Tech product demo catalog
- Admin variant labels adapted for power, connector, length, capacity, model and finish

No schema migration is required. The existing database field named `size` remains in use internally as the generic product-configuration value.

## GitHub web update

Upload the `apps` folder into the root of the existing `ecom-platform` repository and commit to `main`.

Suggested commit message:

`Adapt editorial storefront to Cosmic Tech products`
