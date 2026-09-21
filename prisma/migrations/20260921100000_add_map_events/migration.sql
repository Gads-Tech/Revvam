CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "locationLabel" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Event_startsAt_endsAt_idx" ON "Event"("startsAt", "endsAt");
CREATE INDEX "Event_latitude_longitude_idx" ON "Event"("latitude", "longitude");
CREATE INDEX "Event_hostId_createdAt_idx" ON "Event"("hostId", "createdAt");

ALTER TABLE "Event" ADD CONSTRAINT "Event_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
