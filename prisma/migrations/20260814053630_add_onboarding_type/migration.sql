-- CreateEnum
CREATE TYPE "OnboardingType" AS ENUM ('DRIVER', 'MECHANIC', 'MECHANIC_SHOP', 'DEALERSHIP', 'EXPLORER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingType" "OnboardingType";
