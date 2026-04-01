import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, territories, UserRole } from '@/db';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/territories/:id
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { id } = await ctx.params;
    const [territory] = await db
      .select()
      .from(territories)
      .where(eq(territories.id, id))
      .limit(1);
    if (!territory) return ApiErrors.notFound('Territory', requestId);
    return successResponse(territory, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/territories/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// PUT /api/territories/:id
export const PUT = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const body = (await req.json()) as Record<string, unknown>;

      const [territory] = await db
        .select()
        .from(territories)
        .where(eq(territories.id, id))
        .limit(1);
      if (!territory) return ApiErrors.notFound('Territory', requestId);

      const [updated] = await db
        .update(territories)
        .set({
          name: (body.name as string) ?? territory.name,
          number: (body.number as string) ?? territory.number,
          notes: (body.notes as string) ?? territory.notes,
          householdsCount: (body.householdsCount as number) ?? territory.householdsCount,
          status: (body.status as string) ?? territory.status,
          coveragePercent: (body.coveragePercent as string) ?? territory.coveragePercent,
          boundary: (body.boundary as string) ?? territory.boundary,
          updatedAt: new Date(),
        })
        .where(eq(territories.id, id))
        .returning();

      return successResponse(updated, 'Territory updated', 200, requestId);
    } catch (err) {
      console.error('[PUT /api/territories/:id]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);

// DELETE /api/territories/:id
export const DELETE = RequireRole(UserRole.ADMIN)(
  async (_req: NextRequest, ctx: unknown, _user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const { id } = await (ctx as RouteContext).params;
      const [territory] = await db
        .select({ id: territories.id })
        .from(territories)
        .where(eq(territories.id, id))
        .limit(1);
      if (!territory) return ApiErrors.notFound('Territory', requestId);
      await db.delete(territories).where(eq(territories.id, id));
      return successResponse({ id }, 'Territory deleted', 200, requestId);
    } catch (err) {
      console.error('[DELETE /api/territories/:id]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
