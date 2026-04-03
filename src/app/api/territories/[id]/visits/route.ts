import type { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, visits, households, territories } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/territories/:id/visits
// Returns visits made by the publisher(s) assigned to this territory.
// Note: territory membership for households is determined spatially by coordinates,
// not by a FK. This returns visits from publishers working this territory.
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: territoryId } = await ctx.params;

    // Get the territory to find its assigned publisher
    const [territory] = await db
      .select({ publisherId: territories.publisherId, congregationId: territories.congregationId })
      .from(territories)
      .where(eq(territories.id, territoryId))
      .limit(1);

    if (!territory) {
      return ApiErrors.notFound('Territory', requestId);
    }

    // Get all visits from the assigned publisher on households in this congregation
    // (spatial filtering by territory boundary will be added with PostGIS)
    const whereClause = territory.publisherId
      ? eq(visits.userId, territory.publisherId)
      : eq(visits.id, visits.id); // fallback: return all (PostGIS spatial filter pending)

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
        returnVisitPlanned: visits.returnVisitPlanned,
        nextVisitDate: visits.nextVisitDate,
        notes: visits.notes,
        syncStatus: visits.syncStatus,
        offlineCreated: visits.offlineCreated,
        createdAt: visits.createdAt,
        householdAddress: households.address,
        householdStreetName: households.streetName,
        householdCity: households.city,
      })
      .from(visits)
      .innerJoin(households, eq(visits.householdId, households.id))
      .where(whereClause)
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/territories/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
