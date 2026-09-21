-- Presence heartbeat and privacy controls.
ALTER TABLE "User"
ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showLastSeen" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");
