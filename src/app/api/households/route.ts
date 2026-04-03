import type { NextRequest } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, households } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

// GET /api/households
// Returns households. No FK filters — territory/congregation membership
// is resolved spatially by coordinates when PostGIS is added.
// For now returns all households (scoped spatially in future).
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const results = await db
      .select()
      .from(households)
      .orderBy(asc(households.address));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/households]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/households
// Add a household by address + coordinates.
// No FK to congregation or territory — spatial query determines membership.
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as {
      address: string;
      streetName: string;
      city: string;
      notes?: string;
      latitude?: string;
      longitude?: string;
      location?: string;
    };

    const { address, streetName, city, notes, latitude, longitude, location } = body;

    if (!address || !streetName || !city) {
      return ApiErrors.badRequest('address, streetName, and city are required', undefined, requestId);
    }

    const [newHousehold] = await db
      .insert(households)
      .values({
        address,
        streetName,
        city,
        notes: notes ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        location: location ?? null,
      })
      .returning();

    return successResponse(newHousehold, undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/households]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
