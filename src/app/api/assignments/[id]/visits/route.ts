import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, visits } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/assignments/:id/visits
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: assignmentId } = await ctx.params;

    const results = await db
      .select()
      .from(visits)
      .where(eq(visits.assignmentId, assignmentId))
      .orderBy(visits.visitDate);

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/assignments/:id/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
