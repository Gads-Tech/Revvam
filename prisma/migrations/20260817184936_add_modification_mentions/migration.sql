-- CreateTable
CREATE TABLE "ModificationMention" (
    "id" TEXT NOT NULL,
    "modificationId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "mentionedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModificationMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModificationMention_mentionedUserId_idx" ON "ModificationMention"("mentionedUserId");

-- CreateIndex
CREATE INDEX "ModificationMention_mentionedById_idx" ON "ModificationMention"("mentionedById");

-- CreateIndex
CREATE INDEX "ModificationMention_modificationId_idx" ON "ModificationMention"("modificationId");

-- CreateIndex
CREATE UNIQUE INDEX "ModificationMention_modificationId_mentionedUserId_key" ON "ModificationMention"("modificationId", "mentionedUserId");

-- AddForeignKey
ALTER TABLE "ModificationMention" ADD CONSTRAINT "ModificationMention_modificationId_fkey" FOREIGN KEY ("modificationId") REFERENCES "VehicleModification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationMention" ADD CONSTRAINT "ModificationMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationMention" ADD CONSTRAINT "ModificationMention_mentionedById_fkey" FOREIGN KEY ("mentionedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
