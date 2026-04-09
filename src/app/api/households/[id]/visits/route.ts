import type { NextRequest } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { db, visits, households, encounters } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/households/:id/visits
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: householdId } = await ctx.params;

    const [household] = await db
      .select({ id: households.id, address: households.address, city: households.city })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1);

    if (!household) {
      return ApiErrors.notFound('Household', requestId);
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
      .where(eq(visits.householdId, householdId))
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/households/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
