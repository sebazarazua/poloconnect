ALTER TYPE "MarketplacePaymentStatus" ADD VALUE 'refunded';

ALTER TABLE "MarketplacePayment"
  ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "mpRefundId" TEXT,
  ADD COLUMN "refundLastError" TEXT;

CREATE INDEX "MarketplacePayment_refundedAt_refundNextAttemptAt_idx"
  ON "MarketplacePayment"("refundedAt", "refundNextAttemptAt");
