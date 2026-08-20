-- Manual/external orders, guest checkout, CSV-friendly order metadata, and moderated reviews.
CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'MANUAL', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'WALK_IN', 'MARKETPLACE', 'OTHER');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReviewSource" AS ENUM ('WEBSITE', 'MANUAL', 'IMPORTED');

ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order"
  ADD COLUMN "customerEmail" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'WEBSITE',
  ADD COLUMN "sourceNote" TEXT,
  ADD COLUMN "createdByAdminId" UUID;

UPDATE "Order" AS o
SET "customerEmail" = u."email"
FROM "User" AS u
WHERE o."userId" = u."id" AND o."customerEmail" IS NULL;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_createdByAdminId_fkey"
  FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_customerEmail_createdAt_idx" ON "Order"("customerEmail", "createdAt");
CREATE INDEX "Order_source_createdAt_idx" ON "Order"("source", "createdAt");
CREATE INDEX "Order_createdByAdminId_createdAt_idx" ON "Order"("createdByAdminId", "createdAt");

CREATE TABLE "Review" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "userId" UUID,
  "orderId" UUID,
  "reviewerName" TEXT NOT NULL,
  "reviewerEmail" TEXT,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "source" "ReviewSource" NOT NULL DEFAULT 'WEBSITE',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
  "adminNote" TEXT,
  "editedByAdminAt" TIMESTAMP(3),
  "createdByAdminId" UUID,
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Review_productId_status_createdAt_idx" ON "Review"("productId", "status", "createdAt");
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
CREATE INDEX "Review_reviewerEmail_idx" ON "Review"("reviewerEmail");
CREATE INDEX "Review_orderId_idx" ON "Review"("orderId");

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Review" FROM PUBLIC;
