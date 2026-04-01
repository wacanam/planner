import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { CongregationMember, CongregationRole } from '@/entities/CongregationMember';
import { UserRole } from '@/entities/User';

// GET /api/congregations/:id/members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const memberRepo = AppDataSource.getRepository(CongregationMember);
  const members = await memberRepo.find({
    where: { congregationId: id },
    relations: ['user'],
  });

  return NextResponse.json({ data: members });
}

// POST /api/congregations/:id/members — add a member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Must be a member with service_overseer role or global admin
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) {
    // Allow if global admin
    const authBasic = await withCongregationAuth(req, id);
    if (authBasic instanceof NextResponse) return authBasic;
    if (
      authBasic.user.role !== UserRole.SUPER_ADMIN &&
      authBasic.user.role !== UserRole.ADMIN &&
      authBasic.member?.congregationRole !== CongregationRole.SERVICE_OVERSEER
    ) {
      return NextResponse.json({ error: 'Forbidden: service_overseer required' }, { status: 403 });
    }
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const memberRepo = AppDataSource.getRepository(CongregationMember);

  const existing = await memberRepo.findOne({ where: { userId, congregationId: id } });
  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
  }

  const member = memberRepo.create({ userId, congregationId: id });
  await memberRepo.save(member);

  return NextResponse.json({ data: member }, { status: 201 });
}
