import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, territories, congregationMembers, UserRole, CongregationRole, MemberStatus } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const GLOBAL_ADMIN_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

// PUT /api/territories/:id/boundary
// Save multi-polygon boundary as GeoJSON
// Only Service Overseers and Territory Servants (global or congregation-scoped) can edit
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id: territoryId } = await ctx.params;

    // Get territory and verify it exists
    const [territory] = await db
      .select({
        congregationId: territories.congregationId,
      })
      .from(territories)
      .where(eq(territories.id, territoryId))
      .limit(1);

    if (!territory) return ApiErrors.notFound('Territory', requestId);

    // Authorization: global admins always pass.
    if (!GLOBAL_ADMIN_ROLES.includes(user.role)) {
      // Non-global-admin: fetch this user's congregation membership.
      const [member] = await db
        .select()
        .from(congregationMembers)
        .where(
          and(
            eq(congregationMembers.userId, user.userId),
            eq(congregationMembers.congregationId, territory.congregationId ?? ''),
            eq(congregationMembers.status, MemberStatus.ACTIVE)
          )
        )
        .limit(1);

      if (!member) {
        return ApiErrors.forbidden('Not a member of this congregation', requestId);
      }

      // Users with a global SO/TS role are allowed once membership is confirmed.
      // Users with only UserRole.USER must have the congregation-scoped SO/TS role.
      const hasGlobalManagerRole =
        user.role === UserRole.SERVICE_OVERSEER ||
        user.role === UserRole.TERRITORY_SERVANT;

      const hasCongregationManagerRole =
        member.congregationRole === CongregationRole.SERVICE_OVERSEER ||
        member.congregationRole === CongregationRole.TERRITORY_SERVANT;

      if (!hasGlobalManagerRole && !hasCongregationManagerRole) {
        return ApiErrors.forbidden('Only admins and territory managers can edit boundaries', requestId);
      }
    }

    // Parse request body
    const body = await req.json();
    const { boundary } = body;

    // Allow explicit null to clear the boundary
    if (boundary === undefined) {
      return ApiErrors.badRequest('boundary (GeoJSON or null) is required', undefined, requestId);
    }

    // Validate GeoJSON if not null (basic check)
    if (boundary !== null && (typeof boundary !== 'object' || !boundary.type)) {
      return ApiErrors.badRequest('boundary must be valid GeoJSON or null', undefined, requestId);
    }

    // Save boundary (null clears it)
    const boundaryJson = boundary !== null ? JSON.stringify(boundary) : null;
    
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
  // withCongregationAuth internally calls withAuth, so we just need to check
  // that the initial auth header is present before fetching territory.
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

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
