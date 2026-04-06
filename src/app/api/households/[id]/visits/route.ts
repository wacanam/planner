import type { NextRequest } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, visits, households, users, UserRole } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER, UserRole.TERRITORY_SERVANT];

// GET /api/households/:id/visits
// Returns the full visit history for a household.
// Publishers see all visits (not scoped to themselves — they need context).
// Auth required; household must exist.
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id: householdId } = await ctx.params;

    // Verify household exists
    const [household] = await db
      .select({ id: households.id, address: households.address })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1);

    if (!household) return ApiErrors.notFound('Household', requestId);

    // Regular USER role sees only their own visits on this household
    // TS/SO/Admin sees all visits
    const isPrivileged = (ADMIN_ROLES as string[]).includes(user.role);
    const whereClause = isPrivileged
      ? eq(visits.householdId, householdId)
      : and(eq(visits.householdId, householdId), eq(visits.userId, user.userId));

    const results = await db
      .select({
        id: visits.id,
        userId: visits.userId,
        publisherName: users.name,
        householdId: visits.householdId,
        assignmentId: visits.assignmentId,
        visitDate: visits.visitDate,
        outcome: visits.outcome,
        householdStatusBefore: visits.householdStatusBefore,
        householdStatusAfter: visits.householdStatusAfter,
        duration: visits.duration,
        literatureLeft: visits.literatureLeft,
        bibleTopicDiscussed: visits.bibleTopicDiscussed,
        returnVisitPlanned: visits.returnVisitPlanned,
        nextVisitDate: visits.nextVisitDate,
        nextVisitNotes: visits.nextVisitNotes,
        notes: visits.notes,
        syncStatus: visits.syncStatus,
        offlineCreated: visits.offlineCreated,
        createdAt: visits.createdAt,
        updatedAt: visits.updatedAt,
      })
      .from(visits)
      .innerJoin(users, eq(visits.userId, users.id))
      .where(whereClause)
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/households/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
