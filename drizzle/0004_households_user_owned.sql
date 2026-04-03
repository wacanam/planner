-- Households are pure coordinate-based records — no FK to congregation or territory.
-- Spatial queries (ST_Within) will determine membership when PostGIS is added.
-- This keeps the model correct as boundaries grow/shrink over time.

-- Drop all FK columns from households
ALTER TABLE "households" DROP COLUMN IF EXISTS "congregationId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "territoryId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "createdByUserId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "updatedByUserId";

-- Add separate lat/lng columns for easier indexing before PostGIS
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "latitude" text;
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "longitude" text;

-- Add userId to visits (publisher who logged the visit)
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "userId" uuid;

-- Make assignmentId optional on visits
ALTER TABLE "visits" ALTER COLUMN "assignmentId" DROP NOT NULL;
