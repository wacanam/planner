import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { Territory } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import { paginatedResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/dashboard/territories
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
      const repo = AppDataSource.getRepository(Territory);

      const [territories, total] = await repo.findAndCount({
        where: { congregationId },
        order: { number: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return paginatedResponse(territories, total, page, limit, requestId);
    } catch (err) {
      console.error('[GET /api/dashboard/territories]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
