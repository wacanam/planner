import type { NextRequest } from 'next/server';
import { eq, desc, sql, and, or } from 'drizzle-orm';
import { db, visits, territories, households, UserRole, territoryAssignments } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

// GET /api/territories/:id/visits
// Returns all visits for households assigned to this territory
// RBAC:
// - SUPER_ADMIN / ADMIN: see all visits
// - SERVICE_OVERSEER: see all visits if territory is assigned to them (direct or via service group)
// - PUBLISHER: see only their own visits to households in territory
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

    // Determine if user can see all visits or only their own
    let canSeeAllVisits = isAdmin;

    // Service Overseers can see all visits if territory is assigned to them
    if (user.role === UserRole.SERVICE_OVERSEER && !canSeeAllVisits) {
      // Check if user has this territory assigned (directly or via service group)
      const assignmentCheck = await db
        .select({ id: territoryAssignments.id })
        .from(territoryAssignments)
        .where(
          and(
            eq(territoryAssignments.territoryId, territoryId),
            or(
              // Direct assignment
              eq(territoryAssignments.userId, user.userId),
              // Assignment via service group
              sql`${territoryAssignments.serviceGroupId} IN (
                SELECT id FROM service_groups 
                WHERE "congregationId" = ${territory.congregationId}
                AND id IN (
                  SELECT "groupId" FROM group_members 
                  WHERE "userId" = ${user.userId}
                )
              )`
            )
          )
        )
        .limit(1);

      canSeeAllVisits = assignmentCheck.length > 0;
    }

    // Get visits for households in this territory
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
          // RBAC: restrict by visibility
          !canSeeAllVisits ? eq(visits.userId, user.userId) : undefined
        )
      )
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/territories/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
