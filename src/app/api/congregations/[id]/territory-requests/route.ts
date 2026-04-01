import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, territoryRequests, CongregationRole, TerritoryRequestStatus } from '@/db';

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

  const requests = await db
    .select()
    .from(territoryRequests)
    .where(and(...conditions));

  return NextResponse.json({ data: requests });
}

// POST /api/congregations/:id/territory-requests
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { territoryId } = body;

  const [request] = await db
    .insert(territoryRequests)
    .values({
      congregationId: id,
      publisherId: user.userId,
      territoryId: territoryId ?? null,
      status: TerritoryRequestStatus.PENDING,
    })
    .returning();

  return NextResponse.json({ data: request }, { status: 201 });
}
