-- Reconcile social-schema changes that already exist in the database
-- but were missing from Prisma migration history.
-- This migration is intentionally idempotent so it can also be used by
-- Prisma's shadow database during drift reconciliation.

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "location" TEXT;

CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Post_authorId_createdAt_idx"
ON "Post"("authorId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Post_authorId_fkey'
    ) THEN
        ALTER TABLE "Post"
        ADD CONSTRAINT "Post_authorId_fkey"
        FOREIGN KEY ("authorId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key"
ON "Follow"("followerId", "followingId");

CREATE INDEX IF NOT EXISTS "Follow_followingId_idx"
ON "Follow"("followingId");

CREATE INDEX IF NOT EXISTS "Follow_followerId_idx"
ON "Follow"("followerId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Follow_followerId_fkey'
    ) THEN
        ALTER TABLE "Follow"
        ADD CONSTRAINT "Follow_followerId_fkey"
        FOREIGN KEY ("followerId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Follow_followingId_fkey'
    ) THEN
        ALTER TABLE "Follow"
        ADD CONSTRAINT "Follow_followingId_fkey"
        FOREIGN KEY ("followingId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;
