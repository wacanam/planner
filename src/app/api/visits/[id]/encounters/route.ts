import type { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, encounters, visits } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/visits/:id/encounters
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: visitId } = await ctx.params;

    const results = await db
      .select()
      .from(encounters)
      .where(eq(encounters.visitId, visitId))
      .orderBy(desc(encounters.createdAt));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/visits/:id/encounters]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/visits/:id/encounters
export async function POST(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id: visitId } = await ctx.params;

    // Verify visit exists and get householdId
    const [visit] = await db
      .select({ householdId: visits.householdId })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);

    if (!visit) {
      return ApiErrors.notFound('Visit', requestId);
    }

    const body = (await req.json()) as {
      name?: string;
      gender?: string;
      ageGroup?: string;
      role?: string;
      response: string;
      languageSpoken?: string;
      topicDiscussed?: string;
      literatureAccepted?: string;
      bibleStudyInterest?: boolean;
      returnVisitRequested?: boolean;
      nextVisitNotes?: string;
      notes?: string;
    };

    if (!body.response) {
      return ApiErrors.badRequest('response is required', undefined, requestId);
    }

    const [newEncounter] = await db
      .insert(encounters)
      .values({
        visitId,
        householdId: visit.householdId,
        userId: user.userId,
        name: body.name ?? null,
        gender: body.gender ?? 'unknown',
        ageGroup: body.ageGroup ?? null,
        role: body.role ?? 'unknown',
        response: body.response,
        languageSpoken: body.languageSpoken ?? null,
        topicDiscussed: body.topicDiscussed ?? null,
        literatureAccepted: body.literatureAccepted ?? null,
        bibleStudyInterest: body.bibleStudyInterest ?? false,
        returnVisitRequested: body.returnVisitRequested ?? false,
        nextVisitNotes: body.nextVisitNotes ?? null,
        notes: body.notes ?? null,
        syncStatus: 'synced',
        offlineCreated: false,
      })
      .returning();

    return successResponse(newEncounter, undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/visits/:id/encounters]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
