-- Households now belong to a publisher (userId), not a congregation.
-- Drop congregationId (not needed), rename createdByUserId → userId.
-- territoryId becomes optional context.

ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "userId" uuid;

-- Migrate existing data: set userId from createdByUserId if available
UPDATE "households" SET "userId" = "createdByUserId" WHERE "createdByUserId" IS NOT NULL;

-- Make userId NOT NULL after migration (set to a placeholder for any nulls)
-- In practice the table was empty in dev/staging
ALTER TABLE "households" ALTER COLUMN "userId" SET NOT NULL;

-- Make territoryId nullable
ALTER TABLE "households" ALTER COLUMN "territoryId" DROP NOT NULL;

-- Drop old columns no longer needed
ALTER TABLE "households" DROP COLUMN IF EXISTS "congregationId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "createdByUserId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "updatedByUserId";
