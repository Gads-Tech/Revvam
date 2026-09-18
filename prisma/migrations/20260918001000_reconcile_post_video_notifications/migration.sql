-- Reconcile schema changes that already exist in the development
-- database but were missing from Prisma migration history.

ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "video" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'NotificationType'
        AND e.enumlabel = 'POST_LIKE'
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'POST_LIKE';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'NotificationType'
        AND e.enumlabel = 'POST_COMMENT'
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'POST_COMMENT';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'NotificationType'
        AND e.enumlabel = 'POST_SHARE'
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'POST_SHARE';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'NotificationType'
        AND e.enumlabel = 'POST_MENTION'
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'POST_MENTION';
    END IF;
END $$;
