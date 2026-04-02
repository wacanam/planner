import type { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, territories, users, UserRole, TerritoryStatus } from '@/db';
import { WithCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';
import type { CongregationMember } from '@/db';

// GET /api/congregations/:id/reports/coverage
export const GET = WithCongregationAuth()(
  async (
    _req: NextRequest,
    context: { params: { id: string } },
    user: JwtPayload,
    _member: CongregationMember | null
  ) => {
    const requestId = generateRequestId();
    try {
      // Require TERRITORY_SERVANT or above
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.SERVICE_OVERSEER &&
        user.role !== UserRole.TERRITORY_SERVANT
      ) {
        return ApiErrors.forbidden(undefined, requestId);
      }

      const { id: congregationId } = context.params;

      const rows = await db
        .select({
          id: territories.id,
          number: territories.number,
          name: territories.name,
          status: territories.status,
          coveragePercent: territories.coveragePercent,
          publisherId: territories.publisherId,
          publisherName: users.name,
        })
        .from(territories)
        .leftJoin(users, eq(territories.publisherId, users.id))
        .where(eq(territories.congregationId, congregationId));

      const totalTerritories = rows.length;
      const avgCoveragePercent =
        totalTerritories > 0
          ? rows.reduce((sum, t) => sum + Number(t.coveragePercent), 0) / totalTerritories
          : 0;

      const byStatus = {
        available: rows.filter((t) => t.status === TerritoryStatus.AVAILABLE).length,
        assigned: rows.filter((t) => t.status === TerritoryStatus.ASSIGNED).length,
        completed: rows.filter((t) => t.status === TerritoryStatus.COMPLETED).length,
        archived: rows.filter((t) => t.status === TerritoryStatus.ARCHIVED).length,
      };

      const territoriesList = rows.map((t) => ({
        id: t.id,
        number: t.number,
        name: t.name,
        status: t.status,
        coveragePercent: Number(t.coveragePercent),
        publisherName: t.publisherName ?? undefined,
      }));

      return successResponse(
        {
          totalTerritories,
          avgCoveragePercent: Math.round(avgCoveragePercent * 100) / 100,
          byStatus,
          territories: territoriesList,
        },
        undefined,
        200,
        requestId
      );
    } catch (err) {
      console.error('[GET /api/congregations/:id/reports/coverage]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
