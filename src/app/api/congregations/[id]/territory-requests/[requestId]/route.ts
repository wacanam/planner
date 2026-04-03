import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import {
  db,
  territoryRequests,
  territories,
  territoryAssignments,
  CongregationRole,
  TerritoryRequestStatus,
  TerritoryStatus,
  AssignmentStatus,
} from '@/db';

// PATCH /api/congregations/:id/territory-requests/:requestId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id, requestId } = await params;

  const auth = await withCongregationAuth(req, id, CongregationRole.TERRITORY_SERVANT);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { status, responseMessage, territoryId: bodyTerritoryId } = body;

  if (![TerritoryRequestStatus.APPROVED, TerritoryRequestStatus.REJECTED].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
  }

  if (status === TerritoryRequestStatus.REJECTED && !responseMessage?.trim()) {
    return NextResponse.json(
      { error: 'responseMessage is required when rejecting' },
      { status: 400 }
    );
  }

  const [request] = await db
    .select()
    .from(territoryRequests)
    .where(and(eq(territoryRequests.id, requestId), eq(territoryRequests.congregationId, id)))
    .limit(1);

  if (!request) {
    return NextResponse.json({ error: 'Territory request not found' }, { status: 404 });
  }

  if (request.status !== TerritoryRequestStatus.PENDING) {
    return NextResponse.json({ error: 'Request has already been processed' }, { status: 409 });
  }

  let updatedRequest: typeof territoryRequests.$inferSelect;

  // Use the territory from the original request, or fall back to an overseer-selected one
  const resolvedTerritoryId =
    request.territoryId ?? (bodyTerritoryId as string | undefined) ?? null;

  // When no specific territory was on the original request and the overseer supplies one,
  // validate it belongs to this congregation and is still available before proceeding.
  if (status === TerritoryRequestStatus.APPROVED && !request.territoryId && bodyTerritoryId) {
    const [targetTerritory] = await db
      .select({ id: territories.id })
      .from(territories)
      .where(
        and(
          eq(territories.id, bodyTerritoryId as string),
          eq(territories.congregationId, id),
          eq(territories.status, TerritoryStatus.AVAILABLE)
        )
      )
      .limit(1);

    if (!targetTerritory) {
      return NextResponse.json(
        { error: 'Territory not found, not available, or does not belong to this congregation' },
        { status: 400 }
      );
    }
  }

  if (status === TerritoryRequestStatus.APPROVED && resolvedTerritoryId) {
    // db.batch uses neon's HTTP batch API which executes both statements atomically,
    // so the request status and territory status are updated together.
    const [updatedRequestRows, assignedTerritoryRows] = await db.batch([
      db
        .update(territoryRequests)
        .set({
          status,
          approvedBy: user.userId,
          approvedAt: new Date(),
          responseMessage: responseMessage?.trim() || null,
        })
        .where(eq(territoryRequests.id, requestId))
        .returning(),
      // Guard against race conditions: only update if the territory is still available
      db
        .update(territories)
        .set({
          status: TerritoryStatus.ASSIGNED,
          publisherId: request.publisherId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(territories.id, resolvedTerritoryId),
            eq(territories.status, TerritoryStatus.AVAILABLE)
          )
        )
        .returning(),
    ] as const);

    updatedRequest = updatedRequestRows[0];
    const assignedTerritory = assignedTerritoryRows[0];

    if (assignedTerritory) {
      await db.insert(territoryAssignments).values({
        territoryId: assignedTerritory.id,
        userId: request.publisherId,
        status: AssignmentStatus.ACTIVE,
        assignedAt: new Date(),
        coverageAtAssignment: assignedTerritory.coveragePercent ?? '0',
      });
    }
  } else {
    const [result] = await db
      .update(territoryRequests)
      .set({
        status,
        approvedBy: user.userId,
        approvedAt: new Date(),
        responseMessage: responseMessage?.trim() || null,
      })
      .where(eq(territoryRequests.id, requestId))
      .returning();
    updatedRequest = result;
  }

  return NextResponse.json({ data: updatedRequest });
}
