-- CreateEnum
CREATE TYPE "ModificationCategory" AS ENUM ('PERFORMANCE', 'EXTERIOR', 'INTERIOR', 'WHEELS_TIRES', 'ELECTRICAL', 'MAINTENANCE', 'AUDIO', 'OTHER');

-- CreateTable
CREATE TABLE "VehicleModification" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" "ModificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(12,2),
    "installedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModificationPhoto" (
    "id" TEXT NOT NULL,
    "modificationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModificationPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleModification_vehicleId_idx" ON "VehicleModification"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleModification_vehicleId_category_idx" ON "VehicleModification"("vehicleId", "category");

-- CreateIndex
CREATE INDEX "VehicleModification_installedAt_idx" ON "VehicleModification"("installedAt");

-- CreateIndex
CREATE INDEX "ModificationPhoto_modificationId_idx" ON "ModificationPhoto"("modificationId");

-- AddForeignKey
ALTER TABLE "VehicleModification" ADD CONSTRAINT "VehicleModification_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationPhoto" ADD CONSTRAINT "ModificationPhoto_modificationId_fkey" FOREIGN KEY ("modificationId") REFERENCES "VehicleModification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
