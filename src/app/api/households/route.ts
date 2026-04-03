import type { NextRequest } from 'next/server';
import { asc, eq, and } from 'drizzle-orm';
import { db, households } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

// GET /api/households
// Always returns the current publisher's own households.
// Optional ?territoryId= to filter by territory context.
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const territoryId = req.nextUrl.searchParams.get('territoryId');

    const whereClause = territoryId
      ? and(eq(households.userId, user.userId), eq(households.territoryId, territoryId))
      : eq(households.userId, user.userId);

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
// Creates a household owned by the current publisher.
// territoryId is optional context (which territory were they working).
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
    };

    const { address, streetName, city, notes, territoryId } = body;
    if (!address || !streetName || !city) {
      return ApiErrors.badRequest('address, streetName, and city are required', undefined, requestId);
    }

    const [newHousehold] = await db
      .insert(households)
      .values({
        userId: user.userId,           // owned by publisher
        territoryId: territoryId ?? null, // optional territory context
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
