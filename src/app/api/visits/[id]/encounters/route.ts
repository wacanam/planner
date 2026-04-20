import { desc, eq, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, encounters, visits } from '@/db';
import { ApiErrors, generateRequestId, successResponse } from '@/lib/api-helpers';
import { withAuth } from '@/lib/auth-middleware';
import { buildLegacyEncounterDescription, mapLegacyEncounterRow } from '@/lib/encounters';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/visits/:id/encounters
export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: visitId } = await ctx.params;

    const results = await db
      .select({
        id: encounters.id,
        visitId: sql<string | null>`"encounters"."visitId"`,
        householdId: sql<string | null>`"encounters"."householdId"`,
        userId: sql<string>`"encounters"."userId"`,
        type: sql<string>`"encounters"."type"`,
        personSpoken: sql<string | null>`"encounters"."personSpoken"`,
        description: sql<string | null>`"encounters"."description"`,
        date: sql<Date | string | null>`"encounters"."date"`,
        followUp: sql<boolean | null>`"encounters"."followUp"`,
        followUpNotes: sql<string | null>`"encounters"."followUpNotes"`,
        offlineCreated: encounters.offlineCreated,
        syncedAt: encounters.syncedAt,
        createdAt: encounters.createdAt,
        updatedAt: encounters.updatedAt,
      })
      .from(encounters)
      .where(eq(encounters.visitId, visitId))
      .orderBy(desc(encounters.createdAt));

    return successResponse(results.map(mapLegacyEncounterRow), undefined, 200, requestId);
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
      encounterDate?: string;
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

    const now = new Date();
    const encounterDate = body.encounterDate ? new Date(body.encounterDate) : now;
    const result = await db.execute<{
      id: string;
      visitId: string | null;
      householdId: string | null;
      userId: string;
      type: string;
      personSpoken: string | null;
      description: string | null;
      date: Date | string | null;
      followUp: boolean | null;
      followUpNotes: string | null;
      syncedAt: Date | string | null;
      offlineCreated: boolean | null;
      createdAt: Date | string | null;
      updatedAt: Date | string | null;
    }>(sql`
      insert into "encounters" (
        "visitId",
        "householdId",
        "userId",
        "type",
        "description",
        "personSpoken",
        "date",
        "followUp",
        "followUpNotes",
        "offlineCreated",
        "syncedAt",
        "createdAt",
        "updatedAt"
      )
      values (
        ${visitId},
        ${visit.householdId},
        ${user.userId},
        ${body.response},
        ${buildLegacyEncounterDescription(body)},
        ${body.name ?? null},
        ${encounterDate},
        ${body.returnVisitRequested ?? false},
        ${body.nextVisitNotes ?? body.notes ?? null},
        ${false},
        ${now},
        ${now},
        ${now}
      )
      returning
        "id",
        "visitId",
        "householdId",
        "userId",
        "type",
        "description",
        "personSpoken",
        "date",
        "followUp",
        "followUpNotes",
        "offlineCreated",
        "syncedAt",
        "createdAt",
        "updatedAt"
    `);

    const newEncounter = result.rows[0];
    if (!newEncounter) {
      return ApiErrors.internalError('Encounter was not created', requestId);
    }

    return successResponse(mapLegacyEncounterRow(newEncounter), undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/visits/:id/encounters]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
