-- CreateTable
CREATE TABLE "VehiclePhoto" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiclePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehiclePhoto_vehicleId_idx" ON "VehiclePhoto"("vehicleId");

-- AddForeignKey
ALTER TABLE "VehiclePhoto" ADD CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
