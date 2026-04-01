import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  db,
  territoryAssignments,
  territories,
  UserRole,
  AssignmentStatus,
  TerritoryStatus,
} from '@/db';
import { RequireRole } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId, validateRequired } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// POST /api/assignments
export const POST = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
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

      await db
        .update(territories)
        .set({ status: TerritoryStatus.ASSIGNED, updatedAt: new Date() })
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
          coverageAtAssignment: territory.coveragePercent,
        })
        .returning();

      return successResponse(assignment, 'Territory assigned', 201, requestId);
    } catch (err) {
      console.error('[POST /api/assignments]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
