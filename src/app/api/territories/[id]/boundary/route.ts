import type { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, territories, UserRole } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER, UserRole.TERRITORY_SERVANT];

// PUT /api/territories/:id/boundary
// Save multi-polygon boundary as GeoJSON
// Only Service Overseers and Territory Servants can edit
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id: territoryId } = await ctx.params;

    // Check permission - only specific roles allowed
    if (!ALLOWED_ROLES.includes(user.role as any)) {
      return ApiErrors.forbidden('Only admins and territory managers can edit boundaries', requestId);
    }

    // Get territory and verify ownership/permission
    const [territory] = await db
      .select({
        congregationId: territories.congregationId,
      })
      .from(territories)
      .where(eq(territories.id, territoryId))
      .limit(1);

    if (!territory) return ApiErrors.notFound('Territory', requestId);

    // Verify congregation membership
    const memberCheck = await withCongregationAuth(req, territory.congregationId ?? '');
    if (memberCheck instanceof NextResponse) return memberCheck;

    // Parse request body
    const body = await req.json();
    const { boundary } = body;

    if (!boundary) {
      return ApiErrors.badRequest('boundary (GeoJSON) is required', undefined, requestId);
    }

    // Validate GeoJSON (basic check)
    if (typeof boundary !== 'object' || !boundary.type) {
      return ApiErrors.badRequest('boundary must be valid GeoJSON', undefined, requestId);
    }

    // Save boundary
    const boundaryJson = JSON.stringify(boundary);
    
    const [updated] = await db
      .update(territories)
      .set({
        boundary: boundaryJson,
        updatedAt: new Date(),
      })
      .where(eq(territories.id, territoryId))
      .returning({
        id: territories.id,
        boundary: territories.boundary,
        updatedAt: territories.updatedAt,
      });

    return successResponse(
      {
        id: updated.id,
        boundary: updated.boundary ? JSON.parse(updated.boundary) : null,
        updatedAt: updated.updatedAt,
      },
      'Territory boundary updated successfully',
      200,
      requestId
    );
  } catch (err) {
    console.error('[PUT /api/territories/:id/boundary]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// GET /api/territories/:id/boundary
// Get the boundary for a territory
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id: territoryId } = await ctx.params;

    const [territory] = await db
      .select({
        id: territories.id,
        boundary: territories.boundary,
        congregationId: territories.congregationId,
      })
      .from(territories)
      .where(eq(territories.id, territoryId))
      .limit(1);

    if (!territory) return ApiErrors.notFound('Territory', requestId);

    // Verify congregation membership
    const memberCheck = await withCongregationAuth(req, territory.congregationId ?? '');
    if (memberCheck instanceof NextResponse) return memberCheck;

    return successResponse(
      {
        id: territory.id,
        boundary: territory.boundary ? JSON.parse(territory.boundary) : null,
      },
      undefined,
      200,
      requestId
    );
  } catch (err) {
    console.error('[GET /api/territories/:id/boundary]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
