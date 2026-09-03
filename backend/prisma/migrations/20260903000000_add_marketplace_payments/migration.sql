-- AlterEnum
-- New intermediate state: a listing that still needs its Mercado Pago payment confirmed
-- before it can enter the existing "pending_review" moderation queue.
ALTER TYPE "ProductPublicationStatus" ADD VALUE IF NOT EXISTS 'pending_payment';

-- CreateEnum
CREATE TYPE "MarketplacePaymentStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "MarketplacePayment" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "MarketplacePaymentStatus" NOT NULL DEFAULT 'pending',
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "rawWebhookPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplacePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePayment_mpPaymentId_key" ON "MarketplacePayment"("mpPaymentId");

-- CreateIndex
CREATE INDEX "MarketplacePayment_productId_idx" ON "MarketplacePayment"("productId");

-- CreateIndex
CREATE INDEX "MarketplacePayment_status_idx" ON "MarketplacePayment"("status");

-- AddForeignKey
ALTER TABLE "MarketplacePayment" ADD CONSTRAINT "MarketplacePayment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
