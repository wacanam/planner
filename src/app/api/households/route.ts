import type { NextRequest } from 'next/server';
import { asc, and, eq, sql as drizzleSql } from 'drizzle-orm';
import { db, households, territories } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

// GET /api/households
// ?boundary=<GeoJSON geometry>  — ST_Within (PostGIS, GIST-indexed, exact polygon)
// ?syncTerritory=<id>           — also update territory.householdsCount with the live count
// ?minLat&maxLat&minLng&maxLng  — bbox fallback
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const boundaryParam = searchParams.get('boundary');
    const syncTerritoryId = searchParams.get('syncTerritory');
    const minLat = searchParams.get('minLat');
    const maxLat = searchParams.get('maxLat');
    const minLng = searchParams.get('minLng');
    const maxLng = searchParams.get('maxLng');

    let whereClause: ReturnType<typeof import("drizzle-orm").and> | ReturnType<typeof import("drizzle-orm").sql> | undefined;

    if (boundaryParam) {
      // ── Mode 1: exact polygon via PostGIS ST_Within ────────────────────
      // GIST index on households.location makes this O(log n).
      // When location is NULL (trigger migration not yet applied), fall back
      // to constructing a Point from the latitude/longitude varchar columns.
      whereClause = drizzleSql`
        ST_Within(
          COALESCE(
            ${households.location},
            CASE
              WHEN ${households.latitude}  IS NOT NULL
               AND ${households.longitude} IS NOT NULL
               AND ${households.latitude}  <> ''
               AND ${households.longitude} <> ''
              THEN ST_SetSRID(
                ST_MakePoint(
                  ${households.longitude}::numeric,
                  ${households.latitude}::numeric
                ),
                4326
              )
              ELSE NULL
            END
          ),
          ST_GeomFromGeoJSON(${boundaryParam})
        )
      `;
    } else if (minLat || maxLat || minLng || maxLng) {
      // ── Mode 2: bbox fallback ─────────────────────────────────────────
      const conditions = [];
      if (minLat) conditions.push(drizzleSql`${households.latitude}::numeric >= ${Number(minLat)}`);
      if (maxLat) conditions.push(drizzleSql`${households.latitude}::numeric <= ${Number(maxLat)}`);
      if (minLng) conditions.push(drizzleSql`${households.longitude}::numeric >= ${Number(minLng)}`);
      if (maxLng) conditions.push(drizzleSql`${households.longitude}::numeric <= ${Number(maxLng)}`);
      whereClause = conditions.length ? and(...conditions) : undefined;
    }

    const results = await db
      .select()
      .from(households)
      .where(whereClause)
      .orderBy(asc(households.address));

    // Sync territory householdsCount if requested (keeps static field accurate)
    if (syncTerritoryId && results.length >= 0) {
      try {
        await db
          .update(territories)
          .set({ householdsCount: results.length, updatedAt: new Date() })
          .where(eq(territories.id, syncTerritoryId));
      } catch { /* non-fatal */ }
    }

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
      address: string;
      houseNumber?: string;
      unitNumber?: string;
      streetName: string;
      city: string;
      postalCode?: string;
      country?: string;
      type?: string;
      floor?: number;
      notes?: string;
      latitude?: string;
      longitude?: string;
      location?: string;
    };

    const {
      address,
      houseNumber,
      unitNumber,
      streetName,
      city,
      postalCode,
      country,
      type,
      floor,
      notes,
      latitude,
      longitude,
      location,
    } = body;

    if (!address || !streetName || !city) {
      return ApiErrors.badRequest(
        'address, streetName, and city are required',
        undefined,
        requestId
      );
    }

    const [newHousehold] = await db
      .insert(households)
      .values({
        address,
        houseNumber: houseNumber ?? null,
        unitNumber: unitNumber ?? null,
        streetName,
        city,
        postalCode: postalCode ?? null,
        country: country ?? null,
        type: type ?? 'house',
        floor: floor ?? null,
        notes: notes ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        location: location ?? null,
        createdById: user.userId,
      })
      .returning();

    return successResponse(newHousehold, undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/households]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
