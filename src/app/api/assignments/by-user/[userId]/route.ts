import type { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, territoryAssignments, territories } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { paginatedResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';

type RouteContext = { params: Promise<{ userId: string }> };

// GET /api/assignments/by-user/:userId
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if ('status' in authResult) return authResult;

  try {
    const { userId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    const all = await db
      .select({
        assignment: territoryAssignments,
        territory: territories,
      })
      .from(territoryAssignments)
      .leftJoin(territories, eq(territoryAssignments.territoryId, territories.id))
      .where(eq(territoryAssignments.userId, userId))
      .orderBy(desc(territoryAssignments.createdAt));

    const total = all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);
    return paginatedResponse(paginated, total, page, limit, requestId);
  } catch (err) {
    console.error('[GET /api/assignments/by-user/:userId]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
