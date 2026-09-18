-- CreateEnum
CREATE TYPE "EmergencyType" AS ENUM ('BREAKDOWN', 'OVERHEATING', 'FLAT_TYRE', 'DEAD_BATTERY', 'ENGINE_PROBLEM', 'ACCIDENT', 'FUEL_PROBLEM', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('OPEN', 'OFFERS_RECEIVED', 'ACCEPTED', 'MECHANIC_EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmergencyOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "EmergencyRequest" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "type" "EmergencyType" NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "photo" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "locationLabel" TEXT,
    "acceptedOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyOffer" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "message" TEXT,
    "status" "EmergencyOfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyRequest_acceptedOfferId_key" ON "EmergencyRequest"("acceptedOfferId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_status_createdAt_idx" ON "EmergencyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyRequest_latitude_longitude_idx" ON "EmergencyRequest"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "EmergencyRequest_driverId_createdAt_idx" ON "EmergencyRequest"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyOffer_mechanicId_status_idx" ON "EmergencyOffer"("mechanicId", "status");

-- CreateIndex
CREATE INDEX "EmergencyOffer_emergencyId_status_idx" ON "EmergencyOffer"("emergencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyOffer_emergencyId_mechanicId_key" ON "EmergencyOffer"("emergencyId", "mechanicId");

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "EmergencyOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyOffer" ADD CONSTRAINT "EmergencyOffer_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "EmergencyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyOffer" ADD CONSTRAINT "EmergencyOffer_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
