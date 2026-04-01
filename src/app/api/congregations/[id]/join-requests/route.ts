import { type NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, congregationMembers, users, MemberStatus, CongregationRole } from '@/db';

// GET /api/congregations/:id/join-requests — list pending requests (territory_servant+)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.TERRITORY_SERVANT);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') as MemberStatus | null) ?? MemberStatus.PENDING;

  const requests = await db
    .select({
      id: congregationMembers.id,
      congregationId: congregationMembers.congregationId,
      status: congregationMembers.status,
      joinMessage: congregationMembers.joinMessage,
      reviewNote: congregationMembers.reviewNote,
      joinedAt: congregationMembers.joinedAt,
      reviewedAt: congregationMembers.reviewedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(congregationMembers)
    .leftJoin(users, eq(congregationMembers.userId, users.id))
    .where(and(eq(congregationMembers.congregationId, id), eq(congregationMembers.status, status)))
    .orderBy(desc(congregationMembers.joinedAt));

  return NextResponse.json({ data: requests });
}
