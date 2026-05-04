import type { NextRequest } from 'next/server';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { db, visits, territories, households, UserRole } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

// GET /api/territories/:id/visits
// Finds all households inside the territory boundary via PostGIS ST_Within,
// then returns visits for those households.
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

    // Find households within this territory's boundary using PostGIS ST_Within.
    // boundary may be stored as a GeoJSON Feature (with .geometry) or a raw Geometry — normalise it.
    let householdIds: string[] = [];
    if (territory.boundary) {
      try {
        const parsed = JSON.parse(territory.boundary) as Record<string, unknown>;
        const geomStr = parsed.geometry
          ? JSON.stringify(parsed.geometry)
          : territory.boundary;

        const rows = await db
          .select({ id: households.id })
          .from(households)
          .where(sql`ST_Within(${households.location}, ST_GeomFromGeoJSON(${geomStr}))`);

        householdIds = rows.map((r) => r.id);
      } catch (parseErr) {
        // boundary parse error or PostGIS unavailable — return empty
        console.error('[GET /api/territories/:id/visits] boundary/spatial error:', parseErr);
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
