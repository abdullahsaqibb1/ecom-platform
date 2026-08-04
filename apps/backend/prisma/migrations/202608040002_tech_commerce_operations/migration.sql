CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "InventoryMovementType" AS ENUM ('INITIAL', 'ADJUSTMENT', 'SALE', 'CANCELLATION', 'RETURN', 'DAMAGE', 'RESTOCK');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');
CREATE TYPE "DiscountScope" AS ENUM ('ALL_PRODUCTS', 'PRODUCTS', 'CATEGORIES', 'COLLECTIONS');

ALTER TABLE "Category"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "image" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "parentId" UUID;

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

CREATE TABLE "Collection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "image" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");
CREATE INDEX "Collection_isActive_sortOrder_idx" ON "Collection"("isActive", "sortOrder");

ALTER TABLE "Product"
  ADD COLUMN "costPrice" DECIMAL(12,2),
  ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "barcode" TEXT,
  ADD COLUMN "condition" TEXT DEFAULT 'NEW',
  ADD COLUMN "warrantyMonths" INTEGER,
  ADD COLUMN "compatibility" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "specifications" JSONB,
  ADD COLUMN "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "whatsInBox" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT;

UPDATE "Product"
SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"ProductStatus" ELSE 'ARCHIVED'::"ProductStatus" END;

CREATE INDEX "Product_status_isActive_createdAt_idx" ON "Product"("status", "isActive", "createdAt");
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Product_isFeatured_createdAt_idx" ON "Product"("isFeatured", "createdAt");

ALTER TABLE "ProductVariant"
  ADD COLUMN "costPrice" DECIMAL(12,2),
  ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "barcode" TEXT,
  ADD COLUMN "compatibility" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "specifications" JSONB;

CREATE INDEX "ProductVariant_stock_idx" ON "ProductVariant"("stock");

CREATE TABLE "CollectionProduct" (
  "collectionId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("collectionId", "productId")
);
ALTER TABLE "CollectionProduct"
  ADD CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");
CREATE INDEX "CollectionProduct_collectionId_position_idx" ON "CollectionProduct"("collectionId", "position");

CREATE TABLE "InventoryMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  "variantId" UUID,
  "adminId" UUID,
  "type" "InventoryMovementType" NOT NULL,
  "quantityChange" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reason" TEXT,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");
CREATE INDEX "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId", "createdAt");
CREATE INDEX "InventoryMovement_type_createdAt_idx" ON "InventoryMovement"("type", "createdAt");

CREATE TABLE "Discount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "type" "DiscountType" NOT NULL,
  "scope" "DiscountScope" NOT NULL DEFAULT 'ALL_PRODUCTS',
  "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "minimumOrderAmount" DECIMAL(12,2),
  "maximumDiscountAmount" DECIMAL(12,2),
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "perCustomerLimit" INTEGER,
  "productIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "categoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "collectionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");
CREATE INDEX "Discount_isActive_startsAt_endsAt_idx" ON "Discount"("isActive", "startsAt", "endsAt");

CREATE TABLE "PaymentMethod" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "requiresOnlinePayment" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "configuration" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");
CREATE INDEX "PaymentMethod_isEnabled_sortOrder_idx" ON "PaymentMethod"("isEnabled", "sortOrder");

ALTER TABLE "Order"
  ADD COLUMN "paymentMethodCode" TEXT,
  ADD COLUMN "discountCode" TEXT,
  ADD COLUMN "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "customerNote" TEXT;
CREATE INDEX "Order_discountCode_idx" ON "Order"("discountCode");
