-- 0006_postgis_households_location.sql
-- Add PostGIS geometry column to households, populate from lat/lng varchars,
-- add GIST index for fast ST_Within spatial queries.

-- 1. Enable PostGIS (already installed on Neon, idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geometry column (Point, WGS84)
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);

-- 3. Backfill from existing latitude/longitude varchar columns
UPDATE households
SET location = ST_SetSRID(
  ST_MakePoint(longitude::numeric, latitude::numeric),
  4326
)
WHERE longitude IS NOT NULL
  AND latitude  IS NOT NULL
  AND longitude != ''
  AND latitude  != '';

-- 4. GIST spatial index
CREATE INDEX IF NOT EXISTS households_location_gist
  ON households USING GIST (location);

-- 5. Trigger to keep location in sync on insert/update
CREATE OR REPLACE FUNCTION households_sync_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL
     AND NEW.longitude != '' AND NEW.latitude != '' THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.longitude::numeric, NEW.latitude::numeric),
      4326
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS households_location_sync ON households;
CREATE TRIGGER households_location_sync
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON households
  FOR EACH ROW EXECUTE FUNCTION households_sync_location();
