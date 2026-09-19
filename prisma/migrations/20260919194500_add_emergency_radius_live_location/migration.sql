ALTER TABLE "EmergencyRequest" ADD COLUMN "radiusMeters" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "EmergencyRequest" ADD COLUMN "liveLatitude" DOUBLE PRECISION;
ALTER TABLE "EmergencyRequest" ADD COLUMN "liveLongitude" DOUBLE PRECISION;

CREATE INDEX "EmergencyRequest_status_radiusMeters_idx" ON "EmergencyRequest"("status", "radiusMeters");
