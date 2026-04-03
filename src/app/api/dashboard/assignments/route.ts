import type { NextRequest } from 'next/server';
import { eq, inArray, desc } from 'drizzle-orm';
import { db, territoryAssignments, territories, users, UserRole, AssignmentStatus } from '@/db';
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

      const territoryRows = await db
        .select({ id: territories.id })
        .from(territories)
        .where(eq(territories.congregationId, congregationId));

      const territoryIds = territoryRows.map((t) => t.id);

      if (territoryIds.length === 0) {
        return paginatedResponse([], 0, page, limit, requestId);
      }

      const all = await db
        .select({
          assignment: territoryAssignments,
          territory: territories,
          user: { id: users.id, name: users.name, email: users.email },
        })
        .from(territoryAssignments)
        .leftJoin(territories, eq(territoryAssignments.territoryId, territories.id))
        .leftJoin(users, eq(territoryAssignments.userId, users.id))
        .where(inArray(territoryAssignments.territoryId, territoryIds))
        .orderBy(desc(territoryAssignments.assignedAt));

      const active = all.filter((r) => r.assignment.status === AssignmentStatus.ACTIVE);
      const total = active.length;
      const paginated = active.slice((page - 1) * limit, page * limit);
      return paginatedResponse(paginated, total, page, limit, requestId);
    } catch (err) {
      console.error('[GET /api/dashboard/assignments]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
