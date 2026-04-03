import type { NextRequest } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db, households } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

// GET /api/households?territoryId=:id
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const territoryId = req.nextUrl.searchParams.get('territoryId');
    if (!territoryId) {
      return ApiErrors.badRequest('territoryId is required', undefined, requestId);
    }

    const results = await db
      .select()
      .from(households)
      .where(eq(households.territoryId, territoryId))
      .orderBy(asc(households.address));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/households]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/households
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

    const congregationId = user.congregationId ?? '';

    const [newHousehold] = await db
      .insert(households)
      .values({
        congregationId,
        territoryId,
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
