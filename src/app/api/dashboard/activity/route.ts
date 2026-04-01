import type { NextRequest } from 'next/server';
import { eq, inArray, desc } from 'drizzle-orm';
import { db, territoryRotations, territories, users, UserRole } from '@/db';
import { RequireRole } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/dashboard/activity
export const GET = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { searchParams } = new URL(req.url);
      const congregationId = searchParams.get('congregationId') || user.congregationId;
      const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)));

      if (!congregationId)
        return ApiErrors.badRequest('congregationId is required', undefined, requestId);

      const territoryRows = await db
        .select({ id: territories.id })
        .from(territories)
        .where(eq(territories.congregationId, congregationId));

      const territoryIds = territoryRows.map((t) => t.id);

      if (territoryIds.length === 0) {
        return successResponse({ activity: [] }, undefined, 200, requestId);
      }

      const recentRotations = await db
        .select({
          rotation: territoryRotations,
          territory: { id: territories.id, name: territories.name, number: territories.number },
          assignedUser: { name: users.name },
        })
        .from(territoryRotations)
        .leftJoin(territories, eq(territoryRotations.territoryId, territories.id))
        .leftJoin(users, eq(territoryRotations.assignedUserId, users.id))
        .where(inArray(territoryRotations.territoryId, territoryIds))
        .orderBy(desc(territoryRotations.updatedAt))
        .limit(limit);

      const activity = recentRotations.map(({ rotation, territory: t, assignedUser }) => ({
        id: rotation.id,
        type: 'rotation',
        status: rotation.status,
        territoryId: rotation.territoryId,
        territoryName: t?.name,
        territoryNumber: t?.number,
        userName: assignedUser?.name,
        visitsMade: rotation.visitsMade,
        coverageAchieved: Number(rotation.coverageAchieved),
        startDate: rotation.startDate,
        completedDate: rotation.completedDate,
        updatedAt: rotation.updatedAt,
      }));

      return successResponse({ activity }, undefined, 200, requestId);
    } catch (err) {
      console.error('[GET /api/dashboard/activity]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
