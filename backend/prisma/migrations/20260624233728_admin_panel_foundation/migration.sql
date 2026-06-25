-- CreateEnum
CREATE TYPE "AppContentType" AS ENUM ('logo', 'ad', 'banner', 'news', 'generic');

-- CreateEnum
CREATE TYPE "CommunityModerationActionType" AS ENUM ('added', 'removed', 'banned', 'unbanned');

-- CreateTable
CREATE TABLE "AppContentItem" (
    "id" UUID NOT NULL,
    "type" "AppContentType" NOT NULL,
    "section" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "body" TEXT,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "targetUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AppContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBan" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" TEXT,
    "isPermanent" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdBy" UUID,
    "revokedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityModerationAction" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "actorUserId" UUID,
    "targetUserId" UUID NOT NULL,
    "action" "CommunityModerationActionType" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppContentItem_section_slot_isActive_idx" ON "AppContentItem"("section", "slot", "isActive");

-- CreateIndex
CREATE INDEX "AppContentItem_type_section_idx" ON "AppContentItem"("type", "section");

-- CreateIndex
CREATE INDEX "AppContentItem_startsAt_endsAt_idx" ON "AppContentItem"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AppContentItem_deletedAt_idx" ON "AppContentItem"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppContentItem_section_slot_type_sortOrder_key" ON "AppContentItem"("section", "slot", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "CommunityBan_roomId_revokedAt_idx" ON "CommunityBan"("roomId", "revokedAt");

-- CreateIndex
CREATE INDEX "CommunityBan_userId_revokedAt_idx" ON "CommunityBan"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBan_roomId_userId_key" ON "CommunityBan"("roomId", "userId");

-- CreateIndex
CREATE INDEX "CommunityModerationAction_roomId_createdAt_idx" ON "CommunityModerationAction"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityModerationAction_targetUserId_createdAt_idx" ON "CommunityModerationAction"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityModerationAction_action_createdAt_idx" ON "CommunityModerationAction"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityBan" ADD CONSTRAINT "CommunityBan_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBan" ADD CONSTRAINT "CommunityBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityModerationAction" ADD CONSTRAINT "CommunityModerationAction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
