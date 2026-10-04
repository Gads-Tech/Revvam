-- CreateEnum
CREATE TYPE "VehicleListingStatus" AS ENUM ('NONE', 'FOR_SALE', 'SOLD');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "listingStatus" "VehicleListingStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "listingPrice" DECIMAL(12,2),
ADD COLUMN "listingCurrency" TEXT DEFAULT 'GHS',
ADD COLUMN "listingLocation" TEXT,
ADD COLUMN "listingDescription" TEXT,
ADD COLUMN "listedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
  "id" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetId" TEXT,
  "postId" TEXT,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_targetId_authorId_key" ON "Review"("targetId","authorId");
CREATE INDEX "Review_targetId_createdAt_idx" ON "Review"("targetId","createdAt");
CREATE INDEX "Review_authorId_createdAt_idx" ON "Review"("authorId","createdAt");
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId","blockedId");
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");
CREATE INDEX "Report_reporterId_createdAt_idx" ON "Report"("reporterId","createdAt");
CREATE INDEX "Report_targetId_createdAt_idx" ON "Report"("targetId","createdAt");
CREATE INDEX "Report_postId_createdAt_idx" ON "Report"("postId","createdAt");

ALTER TABLE "Review" ADD CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
