import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryAssignment, AssignmentStatus } from '@/entities/TerritoryAssignment';
import { Territory, TerritoryStatus } from '@/entities/Territory';
import { UserRole } from '@/entities/User';
import { RequireRole } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

type RouteContext = { params: Promise<{ id: string }> };

async function init() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  return {
    assignmentRepo: AppDataSource.getRepository(TerritoryAssignment),
    territoryRepo: AppDataSource.getRepository(Territory),
  };
}

// PUT /api/assignments/:id
export const PUT = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const body = (await req.json()) as Partial<TerritoryAssignment>;
      const { assignmentRepo, territoryRepo } = await init();

      const assignment = await assignmentRepo.findOne({ where: { id }, relations: ['territory'] });
      if (!assignment) return ApiErrors.notFound('Assignment', requestId);

      // If completing, update territory status
      if (body.status === AssignmentStatus.COMPLETED || body.status === AssignmentStatus.RETURNED) {
        assignment.returnedAt = new Date();
        const territory = await territoryRepo.findOne({ where: { id: assignment.territoryId } });
        if (territory) {
          territory.status = TerritoryStatus.AVAILABLE;
          if (body.status === AssignmentStatus.COMPLETED) {
            territory.status = TerritoryStatus.COMPLETED;
          }
          await territoryRepo.save(territory);
        }
      }

      Object.assign(assignment, {
        status: body.status ?? assignment.status,
        notes: body.notes ?? assignment.notes,
        dueAt: body.dueAt ?? assignment.dueAt,
      });

      await assignmentRepo.save(assignment);
      return successResponse(assignment, 'Assignment updated', 200, requestId);
    } catch (err) {
      console.error('[PUT /api/assignments/:id]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
