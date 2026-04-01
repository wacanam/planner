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
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/assignments/:id
export const PUT = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const body = (await req.json()) as Record<string, unknown>;

      const [assignment] = await db
        .select()
        .from(territoryAssignments)
        .where(eq(territoryAssignments.id, id))
        .limit(1);
      if (!assignment) return ApiErrors.notFound('Assignment', requestId);

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
          .set({ status: newTerritoryStatus, updatedAt: new Date() })
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
);
