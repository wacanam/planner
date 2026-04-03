import type { NextRequest } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { db, visits, territories, households } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/territories/:id/visits
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: territoryId } = await ctx.params;

    const [territory] = await db
      .select({ publisherId: territories.publisherId, congregationId: territories.congregationId })
      .from(territories)
      .where(eq(territories.id, territoryId))
      .limit(1);

    if (!territory) {
      return ApiErrors.notFound('Territory', requestId);
    }

    const whereClause = territory.publisherId
      ? eq(visits.userId, territory.publisherId)
      : eq(visits.id, visits.id);

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
        encounterCount: sql<number>`(select count(*) from encounters where encounters."visitId" = ${visits.id})`,
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
