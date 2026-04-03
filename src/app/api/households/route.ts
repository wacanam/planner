import type { NextRequest } from 'next/server';
import { asc, eq, and } from 'drizzle-orm';
import { db, households, UserRole, CongregationRole, congregationMembers, MemberStatus } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

// GET /api/households
// Households are congregation-level physical addresses.
// Filter: ?congregationId= (required) and optional ?territoryId=
// Publishers see all households in the congregation (they work the area).
// Result lets them find known households to log visits against.
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const congregationId = req.nextUrl.searchParams.get('congregationId') ?? user.congregationId;
    const territoryId = req.nextUrl.searchParams.get('territoryId');

    if (!congregationId) {
      return ApiErrors.badRequest('congregationId is required', undefined, requestId);
    }

    const whereClause = territoryId
      ? and(eq(households.congregationId, congregationId), eq(households.territoryId, territoryId))
      : eq(households.congregationId, congregationId);

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

// POST /api/households
// Add a household to the congregation's map.
// Any authenticated member can add a household they discovered.
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const body = (await req.json()) as {
      address: string;
      streetName: string;
      city: string;
      notes?: string;
      territoryId?: string;
      congregationId?: string;
    };

    const { address, streetName, city, notes, territoryId } = body;
    const congregationId = body.congregationId ?? user.congregationId ?? '';

    if (!address || !streetName || !city) {
      return ApiErrors.badRequest('address, streetName, and city are required', undefined, requestId);
    }
    if (!congregationId) {
      return ApiErrors.badRequest('congregationId is required', undefined, requestId);
    }

    const [newHousehold] = await db
      .insert(households)
      .values({
        congregationId,
        territoryId: territoryId ?? null,
        address,
        streetName,
        city,
        notes: notes ?? null,
      })
      .returning();

    return successResponse(newHousehold, undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/households]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
