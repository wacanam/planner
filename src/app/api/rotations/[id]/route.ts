import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryRotation } from '@/entities/TerritoryRotation';
import { UserRole } from '@/entities/User';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

type RouteContext = { params: Promise<{ id: string }> };

async function getRepo() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  return AppDataSource.getRepository(TerritoryRotation);
}

// GET /api/rotations/:id
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { id } = await ctx.params;
    const repo = await getRepo();
    const rotation = await repo.findOne({
      where: { id },
      relations: ['territory', 'assignedUser'],
    });
    if (!rotation) return ApiErrors.notFound('Rotation', requestId);
    return successResponse(rotation, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/rotations/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// PUT /api/rotations/:id/complete is handled in /complete/route.ts
// PUT /api/rotations/:id — SO/ADMIN only
export const PUT = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const body = (await req.json()) as Partial<TerritoryRotation>;
      const repo = await getRepo();
      const rotation = await repo.findOne({ where: { id } });
      if (!rotation) return ApiErrors.notFound('Rotation', requestId);

      Object.assign(rotation, {
        notes: body.notes ?? rotation.notes,
        visitsMade: body.visitsMade ?? rotation.visitsMade,
        coverageAchieved: body.coverageAchieved ?? rotation.coverageAchieved,
      });

      await repo.save(rotation);
      return successResponse(rotation, 'Rotation updated', 200, requestId);
    } catch (err) {
      console.error('[PUT /api/rotations/:id]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
