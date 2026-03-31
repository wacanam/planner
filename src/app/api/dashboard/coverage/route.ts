import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { Territory } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/dashboard/coverage
export const GET = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { searchParams } = new URL(req.url);
      const congregationId = searchParams.get('congregationId') || user.congregationId;
      if (!congregationId)
        return ApiErrors.badRequest('congregationId is required', undefined, requestId);

      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const repo = AppDataSource.getRepository(Territory);
      const territories = await repo.find({ where: { congregationId } });

      const total = territories.length;
      const avgCoverage =
        total > 0 ? territories.reduce((sum, t) => sum + Number(t.coveragePercent), 0) / total : 0;

      const byStatus = territories.reduce<Record<string, number>>((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      }, {});

      const coverageByTerritory = territories.map((t) => ({
        id: t.id,
        number: t.number,
        name: t.name,
        coveragePercent: Number(t.coveragePercent),
        status: t.status,
      }));

      return successResponse(
        { total, avgCoverage: Math.round(avgCoverage * 100) / 100, byStatus, coverageByTerritory },
        undefined,
        200,
        requestId
      );
    } catch (err) {
      console.error('[GET /api/dashboard/coverage]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
