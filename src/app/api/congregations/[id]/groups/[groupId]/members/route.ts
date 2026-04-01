import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, groups, groupMembers, CongregationRole, GroupRole } from '@/db';

// POST /api/congregations/:id/groups/:groupId/members
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id, groupId } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { userId, groupRole = GroupRole.MEMBER } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const validRoles = Object.values(GroupRole);
  if (!validRoles.includes(groupRole)) {
    return NextResponse.json(
      { error: `Invalid groupRole. Must be one of: ${validRoles.join(', ')}` },
      { status: 400 }
    );
  }

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.congregationId, id)))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: 'Group not found in this congregation' }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'User is already in this group' }, { status: 409 });
  }

  const [member] = await db
    .insert(groupMembers)
    .values({ userId, groupId, groupRole })
    .returning();

  return NextResponse.json({ data: member }, { status: 201 });
}
