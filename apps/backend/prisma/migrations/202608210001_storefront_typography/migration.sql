-- Add optional storefront typography configuration. Existing stores continue to use
-- application defaults until settings are published from Storefront Studio.
ALTER TABLE "StorefrontSettings" ADD COLUMN "typography" JSONB;
