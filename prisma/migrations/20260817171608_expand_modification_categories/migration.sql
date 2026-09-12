/*
  Warnings:

  - The values [ELECTRICAL] on the enum `ModificationCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ModificationCategory_new" AS ENUM ('PERFORMANCE', 'EXTERIOR', 'INTERIOR', 'WHEELS_TIRES', 'SUSPENSION', 'EXHAUST', 'AUDIO', 'LIGHTING', 'ENGINE', 'MAINTENANCE', 'OTHER');
ALTER TABLE "VehicleModification" ALTER COLUMN "category" TYPE "ModificationCategory_new" USING ("category"::text::"ModificationCategory_new");
ALTER TYPE "ModificationCategory" RENAME TO "ModificationCategory_old";
ALTER TYPE "ModificationCategory_new" RENAME TO "ModificationCategory";
DROP TYPE "public"."ModificationCategory_old";
COMMIT;
