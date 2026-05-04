import type { NextRequest } from 'next/server';
import { eq, desc, sql, and, or, inArray } from 'drizzle-orm';
import { db, visits, territories, households, territoryAssignments, UserRole } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

// GET /api/territories/:id/visits
// Returns visits scoped to this territory:
//   - visits whose assignmentId matches a territory_assignments record for this territory
//   - visits whose assignmentId equals the territory ID directly (created from the My Assignments view)
// RBAC: admins/SO see all; publishers see only their own.
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

    // Fetch assignment IDs for this territory to use as a safe parameterized filter
    const assignmentRows = await db
      .select({ id: territoryAssignments.id })
      .from(territoryAssignments)
      .where(eq(territoryAssignments.territoryId, territoryId));

    const assignmentIds = assignmentRows.map((r) => r.id);

    // Scope visits to this territory using two strategies:
    // 1. Visits properly linked via territory_assignments (assignmentId = a territory_assignments.id)
    // 2. Visits where assignmentId = territoryId directly (recorded from My Assignments list view,
    //    where the territory ID is used as the assignment context)
    // If no assignment records exist, only strategy 2 is applied; if neither matches, no results are returned.
    const territoryScope =
      assignmentIds.length > 0
        ? or(inArray(visits.assignmentId, assignmentIds), eq(visits.assignmentId, territoryId))
        : eq(visits.assignmentId, territoryId);

    // RBAC: admins/SO see all visits for the territory; publishers see only their own.
    // (The previous behaviour that filtered admin views to territory.publisherId's visits was incorrect —
    // admins need full visibility regardless of who is assigned.)
    const whereConditions = [territoryScope];
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
