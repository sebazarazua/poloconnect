-- CreateTable
CREATE TABLE "HorseAuctionEvent" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Argentina',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HorseAuctionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorseAuctionHorse" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "lotNumber" INTEGER,
    "horseName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "reservePriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "breed" TEXT,
    "sex" TEXT,
    "ageYears" INTEGER,
    "coatColor" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorseAuctionHorse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorseAuctionEvent_slug_key" ON "HorseAuctionEvent"("slug");

-- CreateIndex
CREATE INDEX "HorseAuctionEvent_eventDate_idx" ON "HorseAuctionEvent"("eventDate");

-- CreateIndex
CREATE INDEX "HorseAuctionEvent_deletedAt_idx" ON "HorseAuctionEvent"("deletedAt");

-- CreateIndex
CREATE INDEX "HorseAuctionHorse_eventId_lotNumber_idx" ON "HorseAuctionHorse"("eventId", "lotNumber");

-- CreateIndex
CREATE INDEX "HorseAuctionHorse_ownerName_idx" ON "HorseAuctionHorse"("ownerName");

-- AddForeignKey
ALTER TABLE "HorseAuctionHorse" ADD CONSTRAINT "HorseAuctionHorse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "HorseAuctionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
