-- Reconcile changes that already exist in the database
-- but were not recorded in Prisma migration history.

-- Add Vehicle.type if it does not already exist.
ALTER TABLE "Vehicle"
ADD COLUMN IF NOT EXISTS "type" TEXT;

-- Create DriverProfile if it does not already exist.
CREATE TABLE IF NOT EXISTS "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownsCar" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- Add the unique index if it does not already exist.
CREATE UNIQUE INDEX IF NOT EXISTS "DriverProfile_userId_key"
ON "DriverProfile"("userId");

-- Add the foreign key if it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'DriverProfile_userId_fkey'
    ) THEN
        ALTER TABLE "DriverProfile"
        ADD CONSTRAINT "DriverProfile_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;
