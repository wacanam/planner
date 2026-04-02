import type { NextRequest } from 'next/server';
import { eq, and, inArray, gte, isNotNull } from 'drizzle-orm';
import { db, territories, users, territoryAssignments, UserRole, AssignmentStatus } from '@/db';
import { WithCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';
import type { CongregationMember } from '@/db';

// GET /api/congregations/:id/reports/activity
export const GET = WithCongregationAuth()(
  async (
    _req: NextRequest,
    context: { params: { id: string } },
    user: JwtPayload,
    _member: CongregationMember | null
  ) => {
    const requestId = generateRequestId();
    try {
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.SERVICE_OVERSEER &&
        user.role !== UserRole.TERRITORY_SERVANT
      ) {
        return ApiErrors.forbidden(undefined, requestId);
      }

      const { id: congregationId } = context.params;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const territoryRows = await db
        .select({ id: territories.id })
        .from(territories)
        .where(eq(territories.congregationId, congregationId));

      const territoryIds = territoryRows.map((t) => t.id);

      if (territoryIds.length === 0) {
        return successResponse({ assignments: [], returns: [] }, undefined, 200, requestId);
      }

      const allAssignments = await db
        .select({
          id: territoryAssignments.id,
          status: territoryAssignments.status,
          assignedAt: territoryAssignments.assignedAt,
          returnedAt: territoryAssignments.returnedAt,
          coverageAtAssignment: territoryAssignments.coverageAtAssignment,
          territoryName: territories.name,
          territoryNumber: territories.number,
          publisherName: users.name,
        })
        .from(territoryAssignments)
        .leftJoin(territories, eq(territoryAssignments.territoryId, territories.id))
        .leftJoin(users, eq(territoryAssignments.userId, users.id))
        .where(
          and(
            inArray(territoryAssignments.territoryId, territoryIds),
            gte(territoryAssignments.assignedAt, thirtyDaysAgo)
          )
        );

      const assignments = allAssignments
        .filter((a) => a.assignedAt !== null)
        .map((a) => ({
          id: a.id,
          territoryName: a.territoryName ?? '',
          territoryNumber: a.territoryNumber ?? '',
          publisherName: a.publisherName ?? '',
          assignedAt: a.assignedAt,
        }));

      const returns = allAssignments
        .filter(
          (a) =>
            (a.status === AssignmentStatus.RETURNED || a.status === AssignmentStatus.COMPLETED) &&
            a.returnedAt !== null
        )
        .map((a) => ({
          id: a.id,
          territoryName: a.territoryName ?? '',
          territoryNumber: a.territoryNumber ?? '',
          publisherName: a.publisherName ?? '',
          returnedAt: a.returnedAt,
          coverageAtAssignment: Number(a.coverageAtAssignment),
        }));

      return successResponse({ assignments, returns }, undefined, 200, requestId);
    } catch (err) {
      console.error('[GET /api/congregations/:id/reports/activity]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
