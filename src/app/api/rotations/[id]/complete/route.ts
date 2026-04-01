import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, territoryRotations, territories, UserRole, RotationStatus } from '@/db';
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

      const [rotation] = await db
        .select()
        .from(territoryRotations)
        .where(eq(territoryRotations.id, id))
        .limit(1);
      if (!rotation) return ApiErrors.notFound('Rotation', requestId);

      const coverageAchieved = String(body.coverageAchieved ?? rotation.coverageAchieved);

      const [updated] = await db
        .update(territoryRotations)
        .set({
          status: RotationStatus.COMPLETED,
          completedDate: new Date(),
          coverageAchieved,
          visitsMade: body.visitsMade ?? rotation.visitsMade,
          notes: body.notes ?? rotation.notes,
          updatedAt: new Date(),
        })
        .where(eq(territoryRotations.id, id))
        .returning();

      await db
        .update(territories)
        .set({ coveragePercent: coverageAchieved, updatedAt: new Date() })
        .where(eq(territories.id, rotation.territoryId));

      return successResponse(updated, 'Rotation completed', 200, requestId);
    } catch (err) {
      console.error('[PUT /api/rotations/:id/complete]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
