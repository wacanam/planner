import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, congregationMembers, users, CongregationRole, UserRole } from '@/db';

// GET /api/congregations/:id/members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  const members = await db
    .select({
      id: congregationMembers.id,
      userId: congregationMembers.userId,
      congregationId: congregationMembers.congregationId,
      congregationRole: congregationMembers.congregationRole,
      status: congregationMembers.status,
      joinMessage: congregationMembers.joinMessage,
      joinedAt: congregationMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
    .from(congregationMembers)
    .leftJoin(users, eq(congregationMembers.userId, users.id))
    .where(eq(congregationMembers.congregationId, id));

  return NextResponse.json({ data: members });
}

// POST /api/congregations/:id/members
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;
  const { user, member } = auth;

  const isPrivileged =
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    member?.congregationRole === CongregationRole.SERVICE_OVERSEER;

  if (!isPrivileged) {
    return NextResponse.json({ error: 'Forbidden: service_overseer required' }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: congregationMembers.id })
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.userId, userId),
        eq(congregationMembers.congregationId, id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
  }

  const [newMember] = await db
    .insert(congregationMembers)
    .values({ userId, congregationId: id })
    .returning();

  return NextResponse.json({ data: newMember }, { status: 201 });
}
