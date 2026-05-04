import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, visits, UserRole } from '@/db';
import { ApiErrors, generateRequestId, successResponse } from '@/lib/api-helpers';
import { withAuth } from '@/lib/auth-middleware';

const PRIVILEGED_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/visits/:id
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id } = await ctx.params;

    const [existing] = await db
      .select({ id: visits.id, userId: visits.userId })
      .from(visits)
      .where(eq(visits.id, id))
      .limit(1);

    if (!existing) {
      return ApiErrors.notFound('Visit', requestId);
    }

    if (existing.userId !== user.userId && !PRIVILEGED_ROLES.includes(user.role)) {
      return ApiErrors.forbidden('You do not have permission to delete this visit', requestId);
    }

    await db.delete(visits).where(eq(visits.id, id));

    return successResponse({ id }, 'Visit deleted', 200, requestId);
  } catch (err) {
    console.error('[DELETE /api/visits/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
