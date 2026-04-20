import type { NextRequest } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, visits, territoryAssignments, UserRole } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

// GET /api/assignments/:id/visits
// Publisher sees only their own; SO/admin sees all visits on the assignment.
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id: assignmentId } = await ctx.params;

    // Verify assignment exists
    const [assignment] = await db
      .select({ userId: territoryAssignments.userId })
      .from(territoryAssignments)
      .where(eq(territoryAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return ApiErrors.notFound('Assignment', requestId);

    // Non-admin can only see visits on their own assignment
    const isAdmin = (ADMIN_ROLES as string[]).includes(user.role);
    if (!isAdmin && assignment.userId !== user.userId) {
      return ApiErrors.forbidden('Access denied', requestId);
    }

    const whereClause = isAdmin
      ? eq(visits.assignmentId, assignmentId)
      : and(eq(visits.assignmentId, assignmentId), eq(visits.userId, user.userId));

    const results = await db
      .select()
      .from(visits)
      .where(whereClause)
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/assignments/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
