import type { NextRequest } from 'next/server';
import { eq, desc, sql, and } from 'drizzle-orm';
import { db, visits, territories, households, UserRole } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

// GET /api/territories/:id/visits
// Returns all visits for households assigned to this territory
// Admins see all visits; regular publishers see only their own.
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

    // Get visits for households in this territory
    // Join through territory_assignments table to find households, then get their visits
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
      .where(
        and(
          // Filter to households in this territory via territory_assignments
          sql`${visits.householdId} IN (
            SELECT "householdId" FROM territory_assignments 
            WHERE "territoryId" = ${territoryId}
          )`,
          // Scope: regular users see only their own visits
          !isAdmin ? eq(visits.userId, user.userId) : undefined
        )
      )
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/territories/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
