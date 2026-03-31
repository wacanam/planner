import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryRotation } from '@/entities/TerritoryRotation';
import { Territory } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/dashboard/activity
export const GET = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { searchParams } = new URL(req.url);
      const congregationId = searchParams.get('congregationId') || user.congregationId;
      const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)));

      if (!congregationId)
        return ApiErrors.badRequest('congregationId is required', undefined, requestId);

      if (!AppDataSource.isInitialized) await AppDataSource.initialize();

      const territoryRepo = AppDataSource.getRepository(Territory);
      const rotationRepo = AppDataSource.getRepository(TerritoryRotation);

      const territories = await territoryRepo.find({ where: { congregationId }, select: ['id'] });
      const territoryIds = territories.map((t) => t.id);

      if (territoryIds.length === 0) {
        return successResponse({ activity: [] }, undefined, 200, requestId);
      }

      const recentRotations = await rotationRepo
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.territory', 'territory')
        .leftJoinAndSelect('r.assignedUser', 'user')
        .where('r.territoryId IN (:...ids)', { ids: territoryIds })
        .orderBy('r.updatedAt', 'DESC')
        .take(limit)
        .getMany();

      const activity = recentRotations.map((r) => ({
        id: r.id,
        type: 'rotation',
        status: r.status,
        territoryId: r.territoryId,
        territoryName: r.territory?.name,
        territoryNumber: r.territory?.number,
        userName: r.assignedUser?.name,
        visitsMade: r.visitsMade,
        coverageAchieved: Number(r.coverageAchieved),
        startDate: r.startDate,
        completedDate: r.completedDate,
        updatedAt: r.updatedAt,
      }));

      return successResponse({ activity }, undefined, 200, requestId);
    } catch (err) {
      console.error('[GET /api/dashboard/activity]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
