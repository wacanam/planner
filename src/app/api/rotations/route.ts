import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryRotation, RotationStatus } from '@/entities/TerritoryRotation';
import { Territory } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId, validateRequired } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

async function init() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  return {
    rotationRepo: AppDataSource.getRepository(TerritoryRotation),
    territoryRepo: AppDataSource.getRepository(Territory),
  };
}

// GET /api/rotations?territoryId=...
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const territoryId = searchParams.get('territoryId');
    if (!territoryId) return ApiErrors.badRequest('territoryId is required', undefined, requestId);

    const { rotationRepo } = await init();
    const rotations = await rotationRepo.find({
      where: { territoryId },
      relations: ['assignedUser'],
      order: { startDate: 'DESC' },
    });

    return successResponse(rotations, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/rotations]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/rotations — SO/ADMIN only
export const POST = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const validation = validateRequired(body, ['territoryId'], requestId);
      if (validation) return validation;

      const { rotationRepo, territoryRepo } = await init();
      const territory = await territoryRepo.findOne({ where: { id: body.territoryId as string } });
      if (!territory) return ApiErrors.notFound('Territory', requestId);

      const rotation = rotationRepo.create({
        territoryId: body.territoryId as string,
        assignedUserId: body.assignedUserId as string | undefined,
        status: RotationStatus.ACTIVE,
        startDate: new Date(),
        notes: body.notes as string | undefined,
        coverageAchieved: 0,
        visitsMade: 0,
      });

      await rotationRepo.save(rotation);
      return successResponse(rotation, 'Rotation created', 201, requestId);
    } catch (err) {
      console.error('[POST /api/rotations]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
