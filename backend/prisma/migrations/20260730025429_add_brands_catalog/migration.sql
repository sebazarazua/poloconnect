-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProduct" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BrandProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_isActive_sortOrder_idx" ON "Brand"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Brand_deletedAt_idx" ON "Brand"("deletedAt");

-- CreateIndex
CREATE INDEX "BrandProduct_brandId_isActive_idx" ON "BrandProduct"("brandId", "isActive");

-- CreateIndex
CREATE INDEX "BrandProduct_deletedAt_idx" ON "BrandProduct"("deletedAt");

-- AddForeignKey
ALTER TABLE "BrandProduct" ADD CONSTRAINT "BrandProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
