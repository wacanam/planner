import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import {
  db,
  congregationMembers,
  territoryAssignments,
  territories,
  UserRole,
  CongregationRole,
  MemberStatus,
  AssignmentStatus,
  TerritoryStatus,
} from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId, validateRequired } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

const GLOBAL_ADMIN_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

// POST /api/assignments
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const authResult = withAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = (await req.json()) as Record<string, unknown>;
    const validation = validateRequired(body, ['territoryId'], requestId);
    if (validation) return validation;

    if (!body.userId && !body.serviceGroupId) {
      return ApiErrors.badRequest(
        'Either userId or serviceGroupId is required',
        undefined,
        requestId
      );
    }

    const [territory] = await db
      .select()
      .from(territories)
      .where(eq(territories.id, body.territoryId as string))
      .limit(1);
    if (!territory) return ApiErrors.notFound('Territory', requestId);

    // Check authorization: global admins/overseers pass through; others must be
    // a service overseer (or territory servant) in the territory's congregation.
    if (!GLOBAL_ADMIN_ROLES.includes(user.role) && user.role !== UserRole.SERVICE_OVERSEER) {
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
        return ApiErrors.forbidden('Insufficient permissions to assign territories', requestId);
      }
    }

    await db
      .update(territories)
      .set({
        status: TerritoryStatus.ASSIGNED,
        publisherId: (body.userId as string) ?? null,
        groupId: (body.serviceGroupId as string) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(territories.id, territory.id));

    const [assignment] = await db
      .insert(territoryAssignments)
      .values({
        territoryId: body.territoryId as string,
        userId: (body.userId as string) ?? null,
        serviceGroupId: (body.serviceGroupId as string) ?? null,
        status: AssignmentStatus.ACTIVE,
        assignedAt: new Date(),
        dueAt: body.dueAt ? new Date(body.dueAt as string) : null,
        notes: (body.notes as string) ?? null,
        coverageAtAssignment: territory.coveragePercent ?? '0',
      })
      .returning();

    return successResponse(assignment, 'Territory assigned', 201, requestId);
  } catch (err) {
    console.error('[POST /api/assignments]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
