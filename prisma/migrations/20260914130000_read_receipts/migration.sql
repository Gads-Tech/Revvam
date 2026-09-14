-- Global read-receipt preference for each user.
ALTER TABLE "User"
ADD COLUMN "readReceiptsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Per-user overrides take precedence over the global preference.
CREATE TABLE "ReadReceiptPreference" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReadReceiptPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadReceiptPreference_ownerId_targetId_key"
ON "ReadReceiptPreference"("ownerId", "targetId");

CREATE INDEX "ReadReceiptPreference_targetId_idx"
ON "ReadReceiptPreference"("targetId");

ALTER TABLE "ReadReceiptPreference"
ADD CONSTRAINT "ReadReceiptPreference_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadReceiptPreference"
ADD CONSTRAINT "ReadReceiptPreference_targetId_fkey"
FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
