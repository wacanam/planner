import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, territoryRequests, users, CongregationRole, TerritoryRequestStatus } from '@/db';

// GET /api/congregations/:id/territory-requests
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;
  const { user, member } = auth;

  const isPrivileged =
    !member ||
    member.congregationRole === CongregationRole.SERVICE_OVERSEER ||
    member.congregationRole === CongregationRole.TERRITORY_SERVANT;

  const url = new URL(req.url);
  const statusFilter =
    (url.searchParams.get('status') as TerritoryRequestStatus | null) ??
    TerritoryRequestStatus.PENDING;

  const conditions = [
    eq(territoryRequests.congregationId, id),
    eq(territoryRequests.status, statusFilter),
    ...(!isPrivileged ? [eq(territoryRequests.publisherId, user.userId)] : []),
  ];

  const rows = await db
    .select({
      id: territoryRequests.id,
      congregationId: territoryRequests.congregationId,
      publisherId: territoryRequests.publisherId,
      territoryId: territoryRequests.territoryId,
      status: territoryRequests.status,
      message: territoryRequests.message,
      approvedBy: territoryRequests.approvedBy,
      approvedAt: territoryRequests.approvedAt,
      responseMessage: territoryRequests.responseMessage,
      requestedAt: territoryRequests.requestedAt,
      publisherName: users.name,
    })
    .from(territoryRequests)
    .leftJoin(users, eq(territoryRequests.publisherId, users.id))
    .where(and(...conditions));

  const requests = rows.map((r) => ({
    ...r,
    publisher: r.publisherName ? { name: r.publisherName } : null,
  }));

  return NextResponse.json({ data: requests });
}

// POST /api/congregations/:id/territory-requests
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { territoryId, message } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const [request] = await db
    .insert(territoryRequests)
    .values({
      congregationId: id,
      publisherId: user.userId,
      territoryId: territoryId ?? null,
      message: message.trim(),
      status: TerritoryRequestStatus.PENDING,
    })
    .returning();

  return NextResponse.json({ data: request }, { status: 201 });
}
