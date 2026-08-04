ALTER TABLE "OrderItem" ADD COLUMN "unitCost" DECIMAL(12,2);

UPDATE "OrderItem" AS oi
SET "unitCost" = COALESCE(
  (SELECT pv."costPrice" FROM "ProductVariant" AS pv WHERE pv."id" = oi."variantId"),
  (SELECT p."costPrice" FROM "Product" AS p WHERE p."id" = oi."productId")
)
WHERE oi."unitCost" IS NULL;

CREATE TABLE "StorefrontSettings" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "siteName" TEXT NOT NULL DEFAULT 'Cosmic Tech',
  "logoUrl" TEXT,
  "logoAlt" TEXT,
  "faviconUrl" TEXT,
  "announcementText" TEXT,
  "announcementLinkLabel" TEXT,
  "announcementLinkUrl" TEXT,
  "supportEmail" TEXT,
  "supportPhone" TEXT,
  "navigation" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "homepage" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "footer" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "theme" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorefrontSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentPage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "eyebrow" TEXT,
  "body" TEXT NOT NULL,
  "heroImage" TEXT,
  "sections" JSONB,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderDeletionLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "deletedByAdminId" UUID,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentPage_slug_key" ON "ContentPage"("slug");
CREATE INDEX "ContentPage_isPublished_sortOrder_idx" ON "ContentPage"("isPublished", "sortOrder");
CREATE INDEX "OrderDeletionLog_orderId_idx" ON "OrderDeletionLog"("orderId");
CREATE INDEX "OrderDeletionLog_deletedAt_idx" ON "OrderDeletionLog"("deletedAt");

ALTER TABLE "StorefrontSettings" ADD CONSTRAINT "StorefrontSettings_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPage" ADD CONSTRAINT "ContentPage_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderDeletionLog" ADD CONSTRAINT "OrderDeletionLog_deletedByAdminId_fkey" FOREIGN KEY ("deletedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
