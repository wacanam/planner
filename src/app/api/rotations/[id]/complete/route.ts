import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryRotation, RotationStatus } from '@/entities/TerritoryRotation';
import { Territory } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/rotations/:id/complete
export const PUT = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const body = (await req.json()) as {
        coverageAchieved?: number;
        visitsMade?: number;
        notes?: string;
      };

      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const rotationRepo = AppDataSource.getRepository(TerritoryRotation);
      const territoryRepo = AppDataSource.getRepository(Territory);

      const rotation = await rotationRepo.findOne({ where: { id } });
      if (!rotation) return ApiErrors.notFound('Rotation', requestId);

      rotation.status = RotationStatus.COMPLETED;
      rotation.completedDate = new Date();
      rotation.coverageAchieved = body.coverageAchieved ?? rotation.coverageAchieved;
      rotation.visitsMade = body.visitsMade ?? rotation.visitsMade;
      rotation.notes = body.notes ?? rotation.notes;

      await rotationRepo.save(rotation);

      // Update territory coverage
      const territory = await territoryRepo.findOne({ where: { id: rotation.territoryId } });
      if (territory) {
        territory.coveragePercent = rotation.coverageAchieved;
        await territoryRepo.save(territory);
      }

      return successResponse(rotation, 'Rotation completed', 200, requestId);
    } catch (err) {
      console.error('[PUT /api/rotations/:id/complete]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
