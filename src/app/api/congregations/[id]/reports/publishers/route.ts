import type { NextRequest } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db, territories, users, congregationMembers, territoryAssignments, UserRole, AssignmentStatus, MemberStatus } from '@/db';
import { WithCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';
import type { CongregationMember } from '@/db';

// GET /api/congregations/:id/reports/publishers
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

      // Get all active members
      const members = await db
        .select({
          userId: congregationMembers.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(congregationMembers)
        .leftJoin(users, eq(congregationMembers.userId, users.id))
        .where(
          and(
            eq(congregationMembers.congregationId, congregationId),
            eq(congregationMembers.status, MemberStatus.ACTIVE)
          )
        );

      if (members.length === 0) {
        return successResponse({ publishers: [] }, undefined, 200, requestId);
      }

      const userIds = members.map((m) => m.userId);

      // Get all assignments for these users
      const assignments = await db
        .select({
          id: territoryAssignments.id,
          userId: territoryAssignments.userId,
          status: territoryAssignments.status,
          territoryId: territoryAssignments.territoryId,
          territoryName: territories.name,
          territoryNumber: territories.number,
        })
        .from(territoryAssignments)
        .leftJoin(territories, eq(territoryAssignments.territoryId, territories.id))
        .where(
          and(
            inArray(territoryAssignments.userId, userIds),
            eq(territories.congregationId, congregationId)
          )
        );

      const publishers = members.map((m) => {
        const userAssignments = assignments.filter((a) => a.userId === m.userId);
        const activeAssignments = userAssignments.filter(
          (a) => a.status === AssignmentStatus.ACTIVE
        );
        const completedAssignments = userAssignments.filter(
          (a) =>
            a.status === AssignmentStatus.COMPLETED || a.status === AssignmentStatus.RETURNED
        );

        return {
          userId: m.userId,
          name: m.userName ?? '',
          email: m.userEmail ?? '',
          activeAssignments: activeAssignments.length,
          totalCompleted: completedAssignments.length,
          territories: activeAssignments.map(
            (a) => `${a.territoryNumber} - ${a.territoryName}`
          ),
        };
      });

      return successResponse({ publishers }, undefined, 200, requestId);
    } catch (err) {
      console.error('[GET /api/congregations/:id/reports/publishers]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
