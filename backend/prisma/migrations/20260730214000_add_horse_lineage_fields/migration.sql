-- Add lineage fields commonly used in polo horse catalogs
ALTER TABLE "HorseAuctionHorse"
ADD COLUMN "damName" TEXT,
ADD COLUMN "sireName" TEXT;
