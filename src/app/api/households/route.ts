import type { NextRequest } from 'next/server';
import { asc, and, eq, or } from 'drizzle-orm';
import { db, households, UserRole, CongregationRole, congregationMembers, MemberStatus } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

// GET /api/households?territoryId=:id
// Publishers see only their own households.
// Service overseers and admins see all.
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const territoryId = req.nextUrl.searchParams.get('territoryId');
    if (!territoryId) {
      return ApiErrors.badRequest('territoryId is required', undefined, requestId);
    }

    // Check if user is privileged (overseer/admin sees all)
    const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    let isOverseer = false;
    if (!isAdmin && user.congregationId) {
      const [member] = await db
        .select({ congregationRole: congregationMembers.congregationRole })
        .from(congregationMembers)
        .where(
          and(
            eq(congregationMembers.userId, user.userId),
            eq(congregationMembers.congregationId, user.congregationId),
            eq(congregationMembers.status, MemberStatus.ACTIVE)
          )
        )
        .limit(1);
      isOverseer =
        member?.congregationRole === CongregationRole.SERVICE_OVERSEER ||
        member?.congregationRole === CongregationRole.TERRITORY_SERVANT;
    }

    const whereClause =
      isAdmin || isOverseer
        ? eq(households.territoryId, territoryId)
        : and(
            eq(households.territoryId, territoryId),
            eq(households.createdByUserId, user.userId)
          );

    const results = await db
      .select()
      .from(households)
      .where(whereClause)
      .orderBy(asc(households.address));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/households]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/households — always sets createdByUserId to current user
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const body = (await req.json()) as {
      territoryId: string;
      address: string;
      streetName: string;
      city: string;
      notes?: string;
    };

    const { territoryId, address, streetName, city, notes } = body;
    if (!territoryId || !address || !streetName || !city) {
      return ApiErrors.badRequest(
        'territoryId, address, streetName, and city are required',
        undefined,
        requestId
      );
    }

    const [newHousehold] = await db
      .insert(households)
      .values({
        congregationId: user.congregationId ?? '',
        territoryId,
        address,
        streetName,
        city,
        notes: notes ?? null,
        createdByUserId: user.userId, // scope to publisher
      })
      .returning();

    return successResponse(newHousehold, undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/households]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
