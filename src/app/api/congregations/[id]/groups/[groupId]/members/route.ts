import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { GroupMember, GroupRole } from '@/entities/GroupMember';
import { Group } from '@/entities/Group';
import { CongregationRole } from '@/entities/CongregationMember';

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

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  // Verify group belongs to congregation
  const groupRepo = AppDataSource.getRepository(Group);
  const group = await groupRepo.findOne({ where: { id: groupId, congregationId: id } });
  if (!group) {
    return NextResponse.json({ error: 'Group not found in this congregation' }, { status: 404 });
  }

  const memberRepo = AppDataSource.getRepository(GroupMember);
  const existing = await memberRepo.findOne({ where: { userId, groupId } });
  if (existing) {
    return NextResponse.json({ error: 'User is already in this group' }, { status: 409 });
  }

  const member = memberRepo.create({ userId, groupId, groupRole });
  await memberRepo.save(member);

  return NextResponse.json({ data: member }, { status: 201 });
}
