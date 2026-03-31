# Database Setup & Migrations

This directory contains TypeORM entities and migrations for the Planner application with PostGIS support.

## Entities

### Location
Represents a single point location (e.g., a waypoint, landmark).
- `id`: UUID (primary key)
- `name`: String
- `description`: Text (optional)
- `coordinates`: Point geometry (SRID 4326 - WGS84 latitude/longitude)
- Spatial index: `idx_location_geom` (GiST)

### Zone
Represents a geographic area as a polygon (e.g., service area, boundary).
- `id`: UUID (primary key)
- `name`: String
- `description`: Text (optional)
- `boundary`: Polygon geometry (SRID 4326)
- `areaSquareKm`: Calculated area in square kilometers
- `status`: 'active' | 'inactive' | 'archived'
- Spatial index: `idx_zone_geom` (GiST)

### Route
Represents a path or journey as a linestring (e.g., delivery route, travel path).
- `id`: UUID (primary key)
- `name`: String
- `description`: Text (optional)
- `path`: LineString geometry (SRID 4326)
- `distanceKm`: Calculated distance
- `estimatedMinutes`: Duration estimate
- `status`: 'planned' | 'in_progress' | 'completed' | 'cancelled'
- Spatial index: `idx_route_geom` (GiST)

## Running Migrations

### First Time Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure your `.env.local`:**
   ```bash
   DATABASE_URL=postgres://user:password@your-neon-host.neon.tech/planner?sslmode=require
   ```

3. **Enable PostGIS on your Neon DB** (run in Neon SQL editor):
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

4. **Run migrations:**
   ```bash
   pnpm typeorm migration:run -d src/lib/data-source.ts
   ```

### Creating New Migrations

After modifying entities:

```bash
pnpm typeorm migration:generate src/migrations/YourMigrationName -d src/lib/data-source.ts
```

### Reverting Migrations

```bash
pnpm typeorm migration:revert -d src/lib/data-source.ts
```

## PostGIS Queries

### Find locations within a radius (5 km)
```sql
SELECT * FROM locations 
WHERE ST_DWithin(coordinates, ST_GeomFromText('POINT(0 0)', 4326), 5000);
```

### Check if a point is within a zone
```sql
SELECT z.name FROM zones z 
WHERE ST_Contains(z.boundary, ST_GeomFromText('POINT(lon lat)', 4326));
```

### Calculate distance between two locations
```sql
SELECT ST_Distance(l1.coordinates, l2.coordinates) as distance_meters
FROM locations l1, locations l2 
WHERE l1.id = 'id1' AND l2.id = 'id2';
```

### Get locations along a route (within 100 meters)
```sql
SELECT l.name FROM locations l 
WHERE ST_DWithin(l.coordinates, ST_GeomFromText('LINESTRING(...)', 4326), 100);
```

## Entity Usage Examples

### Creating a Location
```typescript
const location = new Location();
location.name = 'Coffee Shop';
location.coordinates = {
  type: 'Point',
  coordinates: [-73.9857, 40.7484] // [longitude, latitude]
};
await locationRepository.save(location);
```

### Creating a Zone
```typescript
const zone = new Zone();
zone.name = 'Downtown Area';
zone.boundary = {
  type: 'Polygon',
  coordinates: [
    [[-73.99, 40.75], [-73.98, 40.75], [-73.98, 40.74], [-73.99, 40.74], [-73.99, 40.75]]
  ]
};
await zoneRepository.save(zone);
```

### Creating a Route
```typescript
const route = new Route();
route.name = 'Delivery Route A';
route.path = {
  type: 'LineString',
  coordinates: [[-73.9857, 40.7484], [-73.9845, 40.7500], [-73.9830, 40.7510]]
};
route.distanceKm = 2.5;
await routeRepository.save(route);
```

## Troubleshooting

**Error: "geometry type from geometry_columns does not match"**
- Ensure the geometry type in your migration matches the entity definition

**Error: "SRID 4326 does not exist"**
- PostGIS spatial reference system not installed. Run: `CREATE EXTENSION IF NOT EXISTS postgis`

**Spatial index not working**
- Verify the index was created: `SELECT * FROM pg_indexes WHERE tablename = 'locations'`
