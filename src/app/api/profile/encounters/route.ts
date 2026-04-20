import { desc, eq, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, encounters, households, visits } from '@/db';
import { ApiErrors, generateRequestId, successResponse } from '@/lib/api-helpers';
import { withAuth } from '@/lib/auth-middleware';
import { buildLegacyEncounterDescription, mapLegacyEncounterRow } from '@/lib/encounters';

// GET /api/profile/encounters  — returns the current user's full encounter history
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));

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
        householdAddress: households.address,
        householdCity: households.city,
        visitDate: visits.visitDate,
        visitOutcome: visits.outcome,
      })
      .from(encounters)
      .leftJoin(households, eq(encounters.householdId, households.id))
      .leftJoin(visits, eq(encounters.visitId, visits.id))
      .where(eq(encounters.userId, user.userId))
      .orderBy(desc(encounters.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return successResponse(results.map(mapLegacyEncounterRow), undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/profile/encounters]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/profile/encounters - create an encounter without requiring a visit
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const body = (await req.json()) as {
      visitId?: string;
      householdId?: string;
      encounterDate?: string;
      name?: string;
      gender?: string;
      ageGroup?: string;
      role?: string;
      response?: string;
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

    const resolvedVisitId: string | null = body.visitId ?? null;
    let resolvedHouseholdId: string | null = body.householdId ?? null;

    if (resolvedVisitId) {
      const [visit] = await db
        .select({ householdId: visits.householdId })
        .from(visits)
        .where(eq(visits.id, resolvedVisitId))
        .limit(1);

      if (!visit) {
        return ApiErrors.notFound('Visit', requestId);
      }

      resolvedHouseholdId = visit.householdId;
    }

    if (resolvedHouseholdId) {
      const [household] = await db
        .select({ id: households.id })
        .from(households)
        .where(eq(households.id, resolvedHouseholdId))
        .limit(1);

      if (!household) {
        return ApiErrors.notFound('Household', requestId);
      }
    }

    const encounterDate = body.encounterDate ? new Date(body.encounterDate) : new Date();
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
        ${resolvedVisitId},
        ${resolvedHouseholdId},
        ${user.userId},
        ${body.response},
        ${buildLegacyEncounterDescription(body)},
        ${body.name ?? null},
        ${encounterDate},
        ${body.returnVisitRequested ?? false},
        ${body.nextVisitNotes ?? body.notes ?? null},
        ${false},
        ${new Date()},
        ${new Date()},
        ${new Date()}
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
    console.error('[POST /api/profile/encounters]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
