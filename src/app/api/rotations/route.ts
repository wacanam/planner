import type { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, territoryRotations, territories, users, UserRole, RotationStatus } from '@/db';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId, validateRequired } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/rotations?territoryId=...
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const territoryId = searchParams.get('territoryId');
    if (!territoryId) return ApiErrors.badRequest('territoryId is required', undefined, requestId);

    const rotations = await db
      .select({
        rotation: territoryRotations,
        assignedUser: { id: users.id, name: users.name, email: users.email },
      })
      .from(territoryRotations)
      .leftJoin(users, eq(territoryRotations.assignedUserId, users.id))
      .where(eq(territoryRotations.territoryId, territoryId))
      .orderBy(desc(territoryRotations.startDate));

    return successResponse(rotations, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/rotations]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/rotations
export const POST = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const validation = validateRequired(body, ['territoryId'], requestId);
      if (validation) return validation;

      const [territory] = await db
        .select({ id: territories.id })
        .from(territories)
        .where(eq(territories.id, body.territoryId as string))
        .limit(1);
      if (!territory) return ApiErrors.notFound('Territory', requestId);

      const [rotation] = await db
        .insert(territoryRotations)
        .values({
          territoryId: body.territoryId as string,
          assignedUserId: (body.assignedUserId as string) ?? null,
          status: RotationStatus.ACTIVE,
          startDate: new Date(),
          notes: (body.notes as string) ?? null,
          coverageAchieved: '0',
          visitsMade: 0,
        })
        .returning();

      return successResponse(rotation, 'Rotation created', 201, requestId);
    } catch (err) {
      console.error('[POST /api/rotations]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
