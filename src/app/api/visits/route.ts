import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, visits, households } from '@/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, ApiErrors, generateRequestId } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

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

    return successResponse(newVisit, undefined, 201, requestId);
  } catch (err) {
    console.error('[POST /api/visits]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}
