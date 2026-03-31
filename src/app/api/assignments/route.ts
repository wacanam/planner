import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryAssignment, AssignmentStatus } from '@/entities/TerritoryAssignment';
import { Territory, TerritoryStatus } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId, validateRequired } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

async function init() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  return {
    assignmentRepo: AppDataSource.getRepository(TerritoryAssignment),
    territoryRepo: AppDataSource.getRepository(Territory),
  };
}

// POST /api/assignments — SO/ADMIN only
export const POST = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const validation = validateRequired(body, ['territoryId'], requestId);
      if (validation) return validation;

      if (!body.userId && !body.serviceGroupId) {
        return ApiErrors.badRequest(
          'Either userId or serviceGroupId is required',
          undefined,
          requestId
        );
      }

      const { assignmentRepo, territoryRepo } = await init();
      const territory = await territoryRepo.findOne({ where: { id: body.territoryId as string } });
      if (!territory) return ApiErrors.notFound('Territory', requestId);

      // Update territory status
      territory.status = TerritoryStatus.ASSIGNED;
      await territoryRepo.save(territory);

      const assignment = assignmentRepo.create({
        territoryId: body.territoryId as string,
        userId: body.userId as string | undefined,
        serviceGroupId: body.serviceGroupId as string | undefined,
        status: AssignmentStatus.ACTIVE,
        assignedAt: new Date(),
        dueAt: body.dueAt ? new Date(body.dueAt as string) : undefined,
        notes: body.notes as string | undefined,
        coverageAtAssignment: territory.coveragePercent,
      });

      await assignmentRepo.save(assignment);
      return successResponse(assignment, 'Territory assigned', 201, requestId);
    } catch (err) {
      console.error('[POST /api/assignments]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
