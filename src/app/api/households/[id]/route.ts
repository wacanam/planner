import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, households, UserRole } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

const PRIVILEGED_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_OVERSEER];

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/households/:id
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await ctx.params;

    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, id))
      .limit(1);

    if (!household) {
      return ApiErrors.notFound('Household', requestId);
    }

    return successResponse(household, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/households/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// PUT /api/households/:id
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id } = await ctx.params;

    const [existing] = await db
      .select({ id: households.id, createdById: households.createdById })
      .from(households)
      .where(eq(households.id, id))
      .limit(1);

    if (!existing) {
      return ApiErrors.notFound('Household', requestId);
    }

    if (existing.createdById !== user.userId && !PRIVILEGED_ROLES.includes(user.role)) {
      return ApiErrors.forbidden('You do not have permission to update this household', requestId);
    }

    const body = (await req.json()) as {
      address?: string;
      houseNumber?: string;
      unitNumber?: string;
      streetName?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      type?: string;
      floor?: number;
      occupantsCount?: number;
      languages?: string;
      bestTimeToCall?: string;
      status?: string;
      notes?: string;
      lwpNotes?: string;
      latitude?: string;
      longitude?: string;
      location?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date(), updatedById: user.userId };
    if (body.address !== undefined) updates.address = body.address;
    if (body.houseNumber !== undefined) updates.houseNumber = body.houseNumber;
    if (body.unitNumber !== undefined) updates.unitNumber = body.unitNumber;
    if (body.streetName !== undefined) updates.streetName = body.streetName;
    if (body.city !== undefined) updates.city = body.city;
    if (body.postalCode !== undefined) updates.postalCode = body.postalCode;
    if (body.country !== undefined) updates.country = body.country;
    if (body.type !== undefined) updates.type = body.type;
    if (body.floor !== undefined) updates.floor = body.floor;
    if (body.occupantsCount !== undefined) updates.occupantsCount = body.occupantsCount;
    if (body.languages !== undefined) updates.languages = body.languages;
    if (body.bestTimeToCall !== undefined) updates.bestTimeToCall = body.bestTimeToCall;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.lwpNotes !== undefined) updates.lwpNotes = body.lwpNotes;
    if (body.latitude !== undefined) updates.latitude = body.latitude;
    if (body.longitude !== undefined) updates.longitude = body.longitude;
    if (body.location !== undefined) updates.location = body.location;

    const [updated] = await db
      .update(households)
      .set(updates)
      .where(eq(households.id, id))
      .returning();

    return successResponse(updated, 'Household updated', 200, requestId);
  } catch (err) {
    console.error('[PUT /api/households/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// DELETE /api/households/:id
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id } = await ctx.params;

    const [existing] = await db
      .select({ id: households.id, createdById: households.createdById })
      .from(households)
      .where(eq(households.id, id))
      .limit(1);

    if (!existing) {
      return ApiErrors.notFound('Household', requestId);
    }

    if (existing.createdById !== user.userId && !PRIVILEGED_ROLES.includes(user.role)) {
      return ApiErrors.forbidden('You do not have permission to delete this household', requestId);
    }

    await db.delete(households).where(eq(households.id, id));

    return successResponse({ id }, 'Household deleted', 200, requestId);
  } catch (err) {
    console.error('[DELETE /api/households/:id]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

