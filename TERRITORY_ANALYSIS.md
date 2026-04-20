# Territory Visits Root Cause Analysis

## Discovery: PostGIS Infrastructure Already Exists! 🎉

### Current Architecture
✅ **Households have PostGIS geometry:**
- Field: `location` (geometry(Point, 4326))
- Auto-synced from latitude/longitude via DB trigger
- GIST indexed for spatial queries

✅ **API supports spatial queries:**
- `GET /api/households?boundary=<GeoJSON>` → ST_Within() PostGIS query
- `GET /api/households?syncTerritory=<id>` → updates territory.householdsCount
- Bbox fallback: `?minLat&maxLat&minLng&maxLng`

✅ **Territories have boundary field:**
- Field: `boundary` (text/GeoJSON)
- Ready for polygon drawing

## The Real Problem

### Why "No visits yet" happens:

**Current endpoint:** `GET /api/territories/:id/visits`
- ❌ Queries `visits` table directly
- ❌ Filters by `userId` (admin/publisher only)
- ❌ Ignores `territory_assignments` table
- ❌ Never checks household spatial relationship to territory

**It should:**
1. Get households within territory boundary using ST_Within()
2. Get visits to those households
3. Apply RBAC (admins/SO see all, publishers see own)

## Two Possible Solutions

### Option A: Use `territory_assignments` table (Explicit mapping)
**Pros:**
- Fast (simple JOIN)
- Works without polygons
- Gives flexibility for manual assignments

**Cons:**
- Requires manual mapping of households to territories
- Doesn't auto-detect spatial relationship

### Option B: Use PostGIS boundary polygons (Spatial queries)
**Pros:**
- Automatic (ST_Within)
- Scalable (GIST indexed)
- Visual boundary editor (multi-polygon drawing)

**Cons:**
- Requires territory boundaries to be drawn/imported
- More complex queries

## Recommended Approach: HYBRID 🎯

1. **Keep `territory_assignments` for explicit links**
2. **Add multi-polygon boundary drawing UI**
3. **Query uses both:**
   ```sql
   SELECT visits.* FROM visits
   INNER JOIN households ON visits.householdId = households.id
   WHERE (
     -- Method 1: Explicit assignment
     households.id IN (SELECT householdId FROM territory_assignments WHERE territoryId = ?)
     OR
     -- Method 2: Spatial (if boundary exists)
     (
       SELECT boundary FROM territories WHERE id = ?
     ) IS NOT NULL 
     AND ST_Within(households.location, ST_GeomFromGeoJSON(
       SELECT boundary FROM territories WHERE id = ?
     ))
   )
   ```

## Next Feature: Territory Boundary Editor

**Needed:**
- Multi-polygon drawing tool (Leaflet Draw or MapLibre GL Draw)
- Save GeoJSON to `territories.boundary`
- Visual display on territory detail map
- Auto-sync households within boundary

**Benefits:**
- Visual territory management
- Automatic household detection
- No manual assignment needed (for spatial method)
