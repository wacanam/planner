import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryAssignment, AssignmentStatus } from '@/entities/TerritoryAssignment';
import { Territory } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import { paginatedResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/dashboard/assignments
export const GET = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { searchParams } = new URL(req.url);
      const congregationId = searchParams.get('congregationId') || user.congregationId;
      const page = Math.max(1, Number(searchParams.get('page') ?? 1));
      const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

      if (!congregationId)
        return ApiErrors.badRequest('congregationId is required', undefined, requestId);

      if (!AppDataSource.isInitialized) await AppDataSource.initialize();

      // Get active assignments for territories in this congregation
      const assignmentRepo = AppDataSource.getRepository(TerritoryAssignment);
      const territoryRepo = AppDataSource.getRepository(Territory);

      const territories = await territoryRepo.find({
        where: { congregationId },
        select: ['id'],
      });
      const territoryIds = territories.map((t) => t.id);

      if (territoryIds.length === 0) {
        return paginatedResponse([], 0, page, limit, requestId);
      }

      const [assignments, total] = await assignmentRepo
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.territory', 'territory')
        .leftJoinAndSelect('a.user', 'user')
        .leftJoinAndSelect('a.serviceGroup', 'serviceGroup')
        .where('a.territoryId IN (:...ids)', { ids: territoryIds })
        .andWhere('a.status = :status', { status: AssignmentStatus.ACTIVE })
        .orderBy('a.assignedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return paginatedResponse(assignments, total, page, limit, requestId);
    } catch (err) {
      console.error('[GET /api/dashboard/assignments]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
