CREATE TYPE "ReportContentType" AS ENUM ('user', 'chat_message', 'marketplace_listing', 'horse', 'image', 'other');
CREATE TYPE "ReportReason" AS ENUM ('inappropriate', 'harassment', 'spam', 'scam', 'false_information', 'sexual_content', 'violence', 'hate_speech', 'impersonation', 'rights_violation', 'other');
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'in_review', 'resolved', 'dismissed');
CREATE TYPE "ModerationActionType" AS ENUM ('report_status_changed', 'content_hidden', 'content_deleted', 'user_warned', 'user_temporarily_suspended', 'user_permanently_banned', 'user_restored', 'content_restored');
CREATE TYPE "UserSanctionType" AS ENUM ('warning', 'temporary_suspension', 'permanent_ban');

CREATE TABLE "Report" (
  "id" UUID NOT NULL,
  "reporterUserId" UUID,
  "reportedUserId" UUID,
  "contentType" "ReportContentType" NOT NULL,
  "contentId" UUID,
  "reason" "ReportReason" NOT NULL,
  "description" TEXT,
  "context" JSONB NOT NULL DEFAULT '{}',
  "status" "ReportStatus" NOT NULL DEFAULT 'pending',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "internalNote" TEXT,
  "actionTaken" TEXT,
  "moderatorUserId" UUID,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBlock" (
  "blockerUserId" UUID NOT NULL,
  "blockedUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerUserId", "blockedUserId")
);

CREATE TABLE "ModerationAction" (
  "id" UUID NOT NULL,
  "reportId" UUID,
  "moderatorUserId" UUID,
  "targetUserId" UUID,
  "contentType" "ReportContentType",
  "contentId" UUID,
  "action" "ModerationActionType" NOT NULL,
  "note" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSanction" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "moderatorUserId" UUID,
  "reportId" UUID,
  "type" "UserSanctionType" NOT NULL,
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSanction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_status_priority_createdAt_idx" ON "Report"("status", "priority", "createdAt");
CREATE INDEX "Report_reportedUserId_createdAt_idx" ON "Report"("reportedUserId", "createdAt");
CREATE INDEX "Report_reporterUserId_createdAt_idx" ON "Report"("reporterUserId", "createdAt");
CREATE INDEX "Report_contentType_contentId_idx" ON "Report"("contentType", "contentId");
CREATE INDEX "UserBlock_blockedUserId_createdAt_idx" ON "UserBlock"("blockedUserId", "createdAt");
CREATE INDEX "ModerationAction_reportId_createdAt_idx" ON "ModerationAction"("reportId", "createdAt");
CREATE INDEX "ModerationAction_targetUserId_createdAt_idx" ON "ModerationAction"("targetUserId", "createdAt");
CREATE INDEX "ModerationAction_action_createdAt_idx" ON "ModerationAction"("action", "createdAt");
CREATE INDEX "UserSanction_userId_revokedAt_endsAt_idx" ON "UserSanction"("userId", "revokedAt", "endsAt");
CREATE INDEX "UserSanction_reportId_idx" ON "UserSanction"("reportId");

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
