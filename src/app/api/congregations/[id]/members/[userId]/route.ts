import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { CongregationMember, CongregationRole } from '@/entities/CongregationMember';

// PATCH /api/congregations/:id/members/:userId — assign congregation role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;

  // Must be service_overseer or global admin
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { congregationRole } = body;

  const validRoles = [CongregationRole.SERVICE_OVERSEER, CongregationRole.TERRITORY_SERVANT, null];
  if (!validRoles.includes(congregationRole)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be service_overseer, territory_servant, or null' },
      { status: 400 }
    );
  }

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const memberRepo = AppDataSource.getRepository(CongregationMember);
  const member = await memberRepo.findOne({ where: { userId, congregationId: id } });

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  member.congregationRole = congregationRole;
  await memberRepo.save(member);

  return NextResponse.json({ data: member });
}
