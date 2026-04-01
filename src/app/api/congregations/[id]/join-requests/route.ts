import { type NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import {
  db,
  congregations,
  congregationMembers,
  congregationJoinRequests,
  users,
  notifications,
  JoinRequestStatus,
  CongregationRole,
  NotificationType,
} from '@/db';

// GET /api/congregations/:id/join-requests — list pending requests (overseer only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.TERRITORY_SERVANT);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status =
    (searchParams.get('status') as JoinRequestStatus | null) ?? JoinRequestStatus.PENDING;

  const requests = await db
    .select({
      id: congregationJoinRequests.id,
      congregationId: congregationJoinRequests.congregationId,
      status: congregationJoinRequests.status,
      message: congregationJoinRequests.message,
      reviewNote: congregationJoinRequests.reviewNote,
      requestedAt: congregationJoinRequests.requestedAt,
      reviewedAt: congregationJoinRequests.reviewedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(congregationJoinRequests)
    .leftJoin(users, eq(congregationJoinRequests.userId, users.id))
    .where(
      and(
        eq(congregationJoinRequests.congregationId, id),
        eq(congregationJoinRequests.status, status)
      )
    )
    .orderBy(desc(congregationJoinRequests.requestedAt));

  return NextResponse.json({ data: requests });
}
