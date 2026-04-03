-- Correct household model: households are congregation-level physical addresses
-- They belong to a congregation, territory is optional boundary context.
-- NOT owned by individual publishers.

-- Restore congregationId (required)
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "congregationId" uuid;

-- Make territoryId nullable (optional boundary context)
ALTER TABLE "households" ALTER COLUMN "territoryId" DROP NOT NULL;

-- Drop publisher-ownership columns (wrong model)
ALTER TABLE "households" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "createdByUserId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "updatedByUserId";

-- Add userId to visits (publisher who logged the visit)
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "userId" uuid;

-- Make assignmentId optional on visits (publisher can log without an active assignment)
ALTER TABLE "visits" ALTER COLUMN "assignmentId" DROP NOT NULL;
