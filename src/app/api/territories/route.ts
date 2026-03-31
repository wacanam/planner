import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { Territory, TerritoryStatus } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import {
  successResponse,
  paginatedResponse,
  ApiErrors,
  generateRequestId,
  validateRequired,
} from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

async function getRepo() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  return AppDataSource.getRepository(Territory);
}

// GET /api/territories
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(req.url);
    const congregationId = searchParams.get('congregationId');
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    if (!congregationId) {
      return ApiErrors.badRequest('congregationId is required', undefined, requestId);
    }

    const repo = await getRepo();
    const [territories, total] = await repo.findAndCount({
      where: { congregationId },
      order: { number: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginatedResponse(territories, total, page, limit, requestId);
  } catch (err) {
    console.error('[GET /api/territories]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/territories — SO/ADMIN only
export const POST = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const validation = validateRequired(body, ['name', 'number'], requestId);
      if (validation) return validation;

      const repo = await getRepo();
      const territory = repo.create({
        name: body.name as string,
        number: body.number as string,
        notes: body.notes as string | undefined,
        householdsCount: Number(body.householdsCount ?? 0),
        boundary: body.boundary as string | undefined,
        status: TerritoryStatus.AVAILABLE,
        coveragePercent: 0,
        congregationId: (body.congregationId as string) || (user.congregationId ?? ''),
      });

      await repo.save(territory);
      return successResponse(territory, 'Territory created', 201, requestId);
    } catch (err) {
      console.error('[POST /api/territories]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
