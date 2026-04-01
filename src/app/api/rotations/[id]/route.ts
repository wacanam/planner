import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, territoryRotations, users, territories, UserRole } from '@/db';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/rotations/:id
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { id } = await ctx.params;
    const [row] = await db
      .select({
        rotation: territoryRotations,
        territory: territories,
        assignedUser: { id: users.id, name: users.name, email: users.email },
      })
      .from(territoryRotations)
      .leftJoin(territories, eq(territoryRotations.territoryId, territories.id))
      .leftJoin(users, eq(territoryRotations.assignedUserId, users.id))
      .where(eq(territoryRotations.id, id))
      .limit(1);

    if (!row) return ApiErrors.notFound('Rotation', requestId);
    return successResponse(row, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/rotations/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// PUT /api/rotations/:id
export const PUT = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const body = (await req.json()) as Record<string, unknown>;

      const [rotation] = await db
        .select()
        .from(territoryRotations)
        .where(eq(territoryRotations.id, id))
        .limit(1);
      if (!rotation) return ApiErrors.notFound('Rotation', requestId);

      const [updated] = await db
        .update(territoryRotations)
        .set({
          notes: (body.notes as string) ?? rotation.notes,
          visitsMade: (body.visitsMade as number) ?? rotation.visitsMade,
          coverageAchieved: (body.coverageAchieved as string) ?? rotation.coverageAchieved,
          updatedAt: new Date(),
        })
        .where(eq(territoryRotations.id, id))
        .returning();

      return successResponse(updated, 'Rotation updated', 200, requestId);
    } catch (err) {
      console.error('[PUT /api/rotations/:id]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
