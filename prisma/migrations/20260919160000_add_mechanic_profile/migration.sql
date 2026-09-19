CREATE TABLE "MechanicProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "about" TEXT,
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MechanicProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MechanicProfile_userId_key" ON "MechanicProfile"("userId");
CREATE INDEX "MechanicProfile_userId_idx" ON "MechanicProfile"("userId");

ALTER TABLE "MechanicProfile"
ADD CONSTRAINT "MechanicProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
