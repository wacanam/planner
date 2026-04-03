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

  try {
    const body = (await req.json()) as {
      householdId: string;
      assignmentId: string;
      outcome: string;
      notes?: string;
      duration?: number;
      returnVisitPlanned?: boolean;
      nextVisitDate?: string;
      householdStatusAfter?: string;
    };

    const { householdId, assignmentId, outcome, notes, duration, returnVisitPlanned, nextVisitDate, householdStatusAfter } = body;

    if (!householdId || !assignmentId || !outcome) {
      return ApiErrors.badRequest('householdId, assignmentId, and outcome are required', undefined, requestId);
    }

    const [newVisit] = await db
      .insert(visits)
      .values({
        householdId,
        assignmentId,
        outcome,
        notes: notes ?? null,
        duration: duration ?? null,
        returnVisitPlanned: returnVisitPlanned ?? false,
        nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
        householdStatusAfter: householdStatusAfter ?? null,
        visitDate: new Date(),
      })
      .returning();

    // Update household
    const householdUpdate: Record<string, unknown> = {
      lastVisitDate: new Date(),
      lastVisitNotes: notes ?? null,
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
