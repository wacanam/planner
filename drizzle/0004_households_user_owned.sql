-- Households are congregation-level physical addresses with coordinates.
-- Territory membership is determined SPATIALLY by coordinates, NOT by a FK.
-- When territory boundaries change, spatial queries tell which households are inside.

-- Restore congregationId (required)
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "congregationId" uuid;

-- Drop territoryId FK — no longer needed, spatial query handles this
ALTER TABLE "households" DROP COLUMN IF EXISTS "territoryId";

-- Drop publisher-ownership columns
ALTER TABLE "households" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "createdByUserId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "updatedByUserId";

-- Add userId to visits (publisher who logged the visit)
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "userId" uuid;

-- Make assignmentId optional on visits
ALTER TABLE "visits" ALTER COLUMN "assignmentId" DROP NOT NULL;
