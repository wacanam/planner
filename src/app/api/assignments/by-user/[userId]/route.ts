import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryAssignment } from '@/entities/TerritoryAssignment';
import { withAuth } from '@/lib/auth-middleware';
import { paginatedResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';

type RouteContext = { params: Promise<{ userId: string }> };

// GET /api/assignments/by-user/:userId
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { userId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(TerritoryAssignment);

    const [assignments, total] = await repo.findAndCount({
      where: { userId },
      relations: ['territory'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginatedResponse(assignments, total, page, limit, requestId);
  } catch (err) {
    console.error('[GET /api/assignments/by-user/:userId]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
