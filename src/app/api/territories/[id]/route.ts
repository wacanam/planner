import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { Territory } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

async function getRepo() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  return AppDataSource.getRepository(Territory);
}

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/territories/:id — any authenticated user
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { id } = await ctx.params;
    const repo = await getRepo();
    const territory = await repo.findOne({ where: { id } });
    if (!territory) return ApiErrors.notFound('Territory', requestId);
    return successResponse(territory, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/territories/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// PUT /api/territories/:id — SO/ADMIN only
export const PUT = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const body = (await req.json()) as Partial<Territory>;
      const repo = await getRepo();
      const territory = await repo.findOne({ where: { id } });
      if (!territory) return ApiErrors.notFound('Territory', requestId);

      Object.assign(territory, {
        name: body.name ?? territory.name,
        number: body.number ?? territory.number,
        notes: body.notes ?? territory.notes,
        householdsCount: body.householdsCount ?? territory.householdsCount,
        status: body.status ?? territory.status,
        coveragePercent: body.coveragePercent ?? territory.coveragePercent,
        boundary: body.boundary ?? territory.boundary,
      });

      await repo.save(territory);
      return successResponse(territory, 'Territory updated', 200, requestId);
    } catch (err) {
      console.error('[PUT /api/territories/:id]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);

// DELETE /api/territories/:id — ADMIN only
export const DELETE = RequireRole(UserRole.ADMIN)(
  async (_req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const repo = await getRepo();
      const territory = await repo.findOne({ where: { id } });
      if (!territory) return ApiErrors.notFound('Territory', requestId);
      await repo.remove(territory);
      return successResponse({ id }, 'Territory deleted', 200, requestId);
    } catch (err) {
      console.error('[DELETE /api/territories/:id]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
