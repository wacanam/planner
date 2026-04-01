import type { NextRequest } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db, territories, UserRole } from '@/db';
import { RequireRole } from '@/lib/auth-middleware';
import { paginatedResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/dashboard/territories
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

      const all = await db
        .select()
        .from(territories)
        .where(eq(territories.congregationId, congregationId))
        .orderBy(asc(territories.number));

      const total = all.length;
      const paginated = all.slice((page - 1) * limit, page * limit);
      return paginatedResponse(paginated, total, page, limit, requestId);
    } catch (err) {
      console.error('[GET /api/dashboard/territories]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
