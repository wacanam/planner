import type { NextRequest } from 'next/server';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db, visits, households, territories } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

// GET /api/visits
// ?householdId=<uuid>   — filter by household
// ?assignmentId=<uuid>  — filter by assignment
// Returns visits for the authenticated user only (or all for ADMIN+)
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const assignmentId = searchParams.get('assignmentId');

    const conditions = [eq(visits.userId, user.userId)];
    if (householdId) conditions.push(eq(visits.householdId, householdId));
    if (assignmentId) conditions.push(eq(visits.assignmentId, assignmentId));

    const results = await db
      .select({
        id: visits.id,
        userId: visits.userId,
        householdId: visits.householdId,
        assignmentId: visits.assignmentId,
        visitDate: visits.visitDate,
        outcome: visits.outcome,
        householdStatusBefore: visits.householdStatusBefore,
        householdStatusAfter: visits.householdStatusAfter,
        duration: visits.duration,
        literatureLeft: visits.literatureLeft,
        bibleTopicDiscussed: visits.bibleTopicDiscussed,
        returnVisitPlanned: visits.returnVisitPlanned,
        nextVisitDate: visits.nextVisitDate,
        nextVisitNotes: visits.nextVisitNotes,
        notes: visits.notes,
        syncStatus: visits.syncStatus,
        offlineCreated: visits.offlineCreated,
        createdAt: visits.createdAt,
        updatedAt: visits.updatedAt,
        householdAddress: households.address,
        householdCity: households.city,
      })
      .from(visits)
      .innerJoin(households, eq(visits.householdId, households.id))
      .where(and(...conditions))
      .orderBy(desc(visits.visitDate));

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/visits
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const body = (await req.json()) as {
      householdId: string;
      assignmentId?: string;
      outcome: string;
      householdStatusAfter?: string;
      duration?: number;
      literatureLeft?: string;
      bibleTopicDiscussed?: string;
      returnVisitPlanned?: boolean;
      nextVisitDate?: string;
      nextVisitNotes?: string;
      notes?: string;
    };

    const {
      householdId,
      assignmentId,
      outcome,
      householdStatusAfter,
      duration,
      literatureLeft,
      bibleTopicDiscussed,
      returnVisitPlanned,
      nextVisitDate,
      nextVisitNotes,
      notes,
    } = body;

    if (!householdId || !outcome) {
      return ApiErrors.badRequest('householdId and outcome are required', undefined, requestId);
    }

    // Snapshot current household status
    const [household] = await db
      .select({ status: households.status })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1);

    const [newVisit] = await db
      .insert(visits)
      .values({
        userId: user.userId,
        householdId,
        assignmentId: assignmentId ?? null,
        outcome,
        householdStatusBefore: household?.status ?? null,
        householdStatusAfter: householdStatusAfter ?? null,
        duration: duration ?? null,
        literatureLeft: literatureLeft ?? null,
        bibleTopicDiscussed: bibleTopicDiscussed ?? null,
        returnVisitPlanned: returnVisitPlanned ?? false,
        nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
        nextVisitNotes: nextVisitNotes ?? null,
        notes: notes ?? null,
        visitDate: new Date(),
        syncStatus: 'synced',
        offlineCreated: false,
      })
      .returning();

    // Update household last visit info
    const householdUpdate: Record<string, unknown> = {
      lastVisitDate: new Date(),
      lastVisitOutcome: outcome,
      updatedAt: new Date(),
    };
    if (householdStatusAfter) {
      householdUpdate.status = householdStatusAfter;
    }

    await db.update(households).set(householdUpdate).where(eq(households.id, householdId));

    // ── Recalculate territory coverage ────────────────────────────────────
    // Coverage = distinct visited households (status != not_visited) that are
    // spatially within the territory boundary / total households in territory.
    // We use the territory linked via assignmentId (if provided) or fall back
    // to looking up by the assignment on the household's congregation.
    if (assignmentId) {
      try {
        const [assignment] = await db
          .select({ territoryId: sql<string>`ta."territoryId"` })
          .from(sql`territory_assignments ta`)
          .where(sql`ta.id = ${assignmentId}`)
          .limit(1);

        if (assignment?.territoryId) {
          const [territory] = await db
            .select({ boundary: territories.boundary, householdsCount: territories.householdsCount })
            .from(territories)
            .where(eq(territories.id, assignment.territoryId))
            .limit(1);

          if (territory?.boundary) {
            const geo = JSON.parse(territory.boundary);
            const geomStr = geo?.geometry ? JSON.stringify(geo.geometry) : null;

            if (geomStr) {
              // Dynamic denominator: count all households spatially inside territory
              // Worked statuses: visited | return_visit | do_not_visit | moved | inactive
              const [{ workedCount, totalCount }] = await db
                .select({
                  workedCount: sql<number>`COUNT(*) FILTER (WHERE ${households.status} IN ('visited','return_visit','do_not_visit','moved','inactive'))::int`,
                  totalCount:  sql<number>`COUNT(*)::int`,
                })
                .from(households)
                .where(sql`ST_Within(${households.location}, ST_GeomFromGeoJSON(${geomStr}))`);

              const coverage = totalCount > 0
                ? ((workedCount / totalCount) * 100).toFixed(2)
                : '0';

              await db
                .update(territories)
                .set({ coveragePercent: coverage, updatedAt: new Date() })
                .where(eq(territories.id, assignment.territoryId));
            }
          }
        }
      } catch (coverageErr) {
        // Non-fatal — log and continue
        console.error('[POST /api/visits] coverage recalc failed:', coverageErr);
      }
    }

    return successResponse(newVisit, undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
