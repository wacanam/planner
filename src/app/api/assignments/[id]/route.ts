import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import {
  db,
  territoryAssignments,
  territories,
  congregationMembers,
  UserRole,
  CongregationRole,
  MemberStatus,
  AssignmentStatus,
  TerritoryStatus,
} from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const GLOBAL_ADMIN_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

// PUT /api/assignments/:id
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  try {
    const authResult = withAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;

    const [assignment] = await db
      .select()
      .from(territoryAssignments)
      .where(eq(territoryAssignments.id, id))
      .limit(1);
    if (!assignment) return ApiErrors.notFound('Assignment', requestId);

    // Authorization: global admins pass through; others must be a congregation overseer
    if (!GLOBAL_ADMIN_ROLES.includes(user.role) && user.role !== UserRole.SERVICE_OVERSEER) {
      const [territory] = await db
        .select({ congregationId: territories.congregationId })
        .from(territories)
        .where(eq(territories.id, assignment.territoryId))
        .limit(1);

      if (territory) {
        const [member] = await db
          .select()
          .from(congregationMembers)
          .where(
            and(
              eq(congregationMembers.userId, user.userId),
              eq(congregationMembers.congregationId, territory.congregationId),
              eq(congregationMembers.status, MemberStatus.ACTIVE)
            )
          )
          .limit(1);

        const allowed =
          member?.congregationRole === CongregationRole.SERVICE_OVERSEER ||
          member?.congregationRole === CongregationRole.TERRITORY_SERVANT;

        if (!allowed) {
          return ApiErrors.forbidden('Insufficient permissions to update assignments', requestId);
        }
      }
    }

    const newStatus = (body.status as AssignmentStatus) ?? assignment.status;
    let returnedAt = assignment.returnedAt;

    if (newStatus === AssignmentStatus.COMPLETED || newStatus === AssignmentStatus.RETURNED) {
      returnedAt = new Date();
      const newTerritoryStatus =
        newStatus === AssignmentStatus.COMPLETED
          ? TerritoryStatus.COMPLETED
          : TerritoryStatus.AVAILABLE;
      await db
        .update(territories)
        .set({
          status: newTerritoryStatus,
          publisherId: null,
          groupId: null,
          updatedAt: new Date(),
        })
        .where(eq(territories.id, assignment.territoryId));
    }

    const [updated] = await db
      .update(territoryAssignments)
      .set({
        status: newStatus,
        notes: (body.notes as string) ?? assignment.notes,
        dueAt: (body.dueAt as Date) ?? assignment.dueAt,
        returnedAt,
        updatedAt: new Date(),
      })
      .where(eq(territoryAssignments.id, id))
      .returning();

    return successResponse(updated, 'Assignment updated', 200, requestId);
  } catch (err) {
    console.error('[PUT /api/assignments/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
