-- CreateTable
CREATE TABLE "SpotlightEvent" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "youtubeUrl" TEXT,
    "backgroundImageUrl" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SpotlightEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpotlightEvent_scheduledAt_endsAt_idx" ON "SpotlightEvent"("scheduledAt", "endsAt");
