-- Add structured notification preferences for persisted settings.
ALTER TABLE "UserSettings"
ADD COLUMN "notificationPreferences" JSONB NOT NULL DEFAULT '{}'::jsonb;