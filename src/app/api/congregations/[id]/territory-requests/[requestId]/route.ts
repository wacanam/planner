import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, territoryRequests, CongregationRole, TerritoryRequestStatus } from '@/db';

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
  const { status } = body;

  if (![TerritoryRequestStatus.APPROVED, TerritoryRequestStatus.REJECTED].includes(status)) {
    return NextResponse.json(
      { error: 'status must be approved or rejected' },
      { status: 400 }
    );
  }

  const [request] = await db
    .select()
    .from(territoryRequests)
    .where(
      and(eq(territoryRequests.id, requestId), eq(territoryRequests.congregationId, id))
    )
    .limit(1);

  if (!request) {
    return NextResponse.json({ error: 'Territory request not found' }, { status: 404 });
  }

  if (request.status !== TerritoryRequestStatus.PENDING) {
    return NextResponse.json({ error: 'Request has already been processed' }, { status: 409 });
  }

  const [updated] = await db
    .update(territoryRequests)
    .set({ status, approvedBy: user.userId, approvedAt: new Date() })
    .where(eq(territoryRequests.id, requestId))
    .returning();

  return NextResponse.json({ data: updated });
}
