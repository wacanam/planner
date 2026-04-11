import type { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, encounters, households, visits } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

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
        visitId: encounters.visitId,
        householdId: encounters.householdId,
        userId: encounters.userId,
        name: encounters.name,
        gender: encounters.gender,
        ageGroup: encounters.ageGroup,
        role: encounters.role,
        response: encounters.response,
        languageSpoken: encounters.languageSpoken,
        topicDiscussed: encounters.topicDiscussed,
        literatureAccepted: encounters.literatureAccepted,
        bibleStudyInterest: encounters.bibleStudyInterest,
        returnVisitRequested: encounters.returnVisitRequested,
        nextVisitNotes: encounters.nextVisitNotes,
        notes: encounters.notes,
        syncStatus: encounters.syncStatus,
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

    return successResponse(results, undefined, 200, requestId);
  } catch (err) {
    console.error('[GET /api/profile/encounters]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
