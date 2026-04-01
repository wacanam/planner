import type { NextRequest } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db, territories, TerritoryStatus, UserRole } from '@/db';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import {
  successResponse,
  paginatedResponse,
  ApiErrors,
  generateRequestId,
  validateRequired,
} from '@/lib/api-helpers';
import type { JwtPayload } from '@/lib/jwt';

// GET /api/territories
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(req.url);
    const congregationId = searchParams.get('congregationId');
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    if (!congregationId) {
      return ApiErrors.badRequest('congregationId is required', undefined, requestId);
    }

    const all = await db
      .select()
      .from(territories)
      .where(eq(territories.congregationId, congregationId))
      .orderBy(asc(territories.number));

    const total = all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);
    return paginatedResponse(paginated, total, page, limit, requestId);
  } catch (err) {
    console.error('[GET /api/territories]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/territories
export const POST = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const validation = validateRequired(body, ['name', 'number'], requestId);
      if (validation) return validation;

      const [territory] = await db
        .insert(territories)
        .values({
          name: body.name as string,
          number: body.number as string,
          notes: body.notes as string | undefined,
          householdsCount: Number(body.householdsCount ?? 0),
          boundary: body.boundary as string | undefined,
          status: TerritoryStatus.AVAILABLE,
          coveragePercent: '0',
          congregationId: (body.congregationId as string) || (user.congregationId ?? ''),
        })
        .returning();

      return successResponse(territory, 'Territory created', 201, requestId);
    } catch (err) {
      console.error('[POST /api/territories]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
