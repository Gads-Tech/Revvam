-- Add rich chat message types and optional media/location metadata.
DO $$ BEGIN
  CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'LOCATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;

