import type { NextRequest } from 'next/server';
import { eq, desc, sql, and, inArray, gte, lte } from 'drizzle-orm';
import { db, visits, territories, households, UserRole } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

/**
 * Extract an [minLng, minLat, maxLng, maxLat] bounding box from a GeoJSON Geometry string.
 * Handles Polygon and MultiPolygon coordinate arrays by flattening all rings.
 */
function extractBBox(geomStr: string): [number, number, number, number] | null {
  try {
    const geom = JSON.parse(geomStr) as { coordinates?: unknown };
    if (!geom.coordinates) return null;

    const lngs: number[] = [];
    const lats: number[] = [];

    const flatten = (c: unknown): void => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === 'number' && typeof c[1] === 'number') {
        lngs.push(c[0] as number);
        lats.push(c[1] as number);
      } else {
        (c as unknown[]).forEach(flatten);
      }
    };
    flatten(geom.coordinates);

    if (!lngs.length) return null;
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  } catch {
    return null;
  }
}

// GET /api/territories/:id/visits
// Finds all households inside the territory boundary, then returns visits for those households.
// Strategy 1 (preferred): PostGIS ST_Within on the geometry column (GIST-indexed, exact polygon).
// Strategy 2 (fallback):  lat/lng bounding-box filter when ST_Within returns no rows
//                         (e.g. location column not yet populated on every row).
// RBAC: admins/SO see all visits; publishers see only their own.
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id: territoryId } = await ctx.params;

    const [territory] = await db
      .select({
        congregationId: territories.congregationId,
        boundary: territories.boundary,
      })
      .from(territories)
      .where(eq(territories.id, territoryId))
      .limit(1);

    if (!territory) return ApiErrors.notFound('Territory', requestId);

    // Verify congregation membership (global admins bypass)
    const isAdmin = (ADMIN_ROLES as string[]).includes(user.role);
    if (!isAdmin) {
      const memberCheck = await withCongregationAuth(req, territory.congregationId ?? '');
      if (memberCheck instanceof NextResponse) return memberCheck;
    }

    let householdIds: string[] = [];

    if (territory.boundary) {
      // Normalise: boundary may be a GeoJSON Feature (has .geometry) or a raw Geometry
      let geomStr: string | null = null;
      try {
        const parsed = JSON.parse(territory.boundary) as Record<string, unknown>;
        geomStr = parsed.geometry
          ? JSON.stringify(parsed.geometry)
          : territory.boundary;
      } catch (parseErr) {
        console.error('[GET /api/territories/:id/visits] boundary parse error:', parseErr);
      }

      if (geomStr) {
        // Pre-compute bbox once — used by Strategy 2 if needed
        const bbox = extractBBox(geomStr);

        // ── Strategy 1: exact polygon membership via PostGIS ──────────────────
        try {
          const rows = await db
            .select({ id: households.id })
            .from(households)
            .where(sql`ST_Within(${households.location}, ST_GeomFromGeoJSON(${geomStr}))`);

          householdIds = rows.map((r) => r.id);
        } catch (spatialErr) {
          console.error('[GET /api/territories/:id/visits] ST_Within error:', spatialErr);
        }

        // ── Strategy 2: lat/lng bbox fallback ─────────────────────────────────
        // Used when PostGIS location column is NULL on some rows (e.g. migration
        // hasn't backfilled every household yet) or when ST_Within returns nothing.
        if (householdIds.length === 0 && bbox) {
          const [minLng, minLat, maxLng, maxLat] = bbox;
          const lat = sql<number>`${households.latitude}::numeric`;
          const lng = sql<number>`${households.longitude}::numeric`;
          try {
            const rows = await db
              .select({ id: households.id })
              .from(households)
              .where(and(gte(lat, minLat), lte(lat, maxLat), gte(lng, minLng), lte(lng, maxLng)));
            householdIds = rows.map((r) => r.id);
          } catch (bboxErr) {
            console.error('[GET /api/territories/:id/visits] bbox fallback error:', bboxErr);
          }
        }
      }
    }

    if (householdIds.length === 0) {
      return successResponse([], undefined, 200, requestId);
    }

    // Scope to households in territory; RBAC: publishers see only their own visits
    const whereConditions = [inArray(visits.householdId, householdIds)];
    if (!isAdmin) {
      whereConditions.push(eq(visits.userId, user.userId));
    }

    const results = await db
      .select({
        id: visits.id,
        userId: visits.userId,
        householdId: visits.householdId,
        assignmentId: visits.assignmentId,
        householdStatusBefore: visits.householdStatusBefore,
        householdStatusAfter: visits.householdStatusAfter,
        visitDate: visits.visitDate,
        duration: visits.duration,
        outcome: visits.outcome,
        literatureLeft: visits.literatureLeft,
        bibleTopicDiscussed: visits.bibleTopicDiscussed,
        returnVisitPlanned: visits.returnVisitPlanned,
        nextVisitDate: visits.nextVisitDate,
        nextVisitNotes: visits.nextVisitNotes,
        notes: visits.notes,
        syncStatus: visits.syncStatus,
        offlineCreated: visits.offlineCreated,
        syncedAt: visits.syncedAt,
        createdAt: visits.createdAt,
        updatedAt: visits.updatedAt,
        householdAddress: households.address,
        householdCity: households.city,
        encounterCount: sql<number>`(select count(*) from encounters where encounters."visitId" = ${visits.id})::int`,
      })
      .from(visits)
      .innerJoin(households, eq(visits.householdId, households.id))
      .where(and(...whereConditions))
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/territories/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
