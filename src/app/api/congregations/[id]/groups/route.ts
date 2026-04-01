import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { Group } from '@/entities/Group';
import { CongregationRole } from '@/entities/CongregationMember';

// GET /api/congregations/:id/groups
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const groupRepo = AppDataSource.getRepository(Group);
  const groups = await groupRepo.find({
    where: { congregationId: id },
    relations: ['members', 'members.user'],
  });

  return NextResponse.json({ data: groups });
}

// POST /api/congregations/:id/groups — create group (service_overseer or admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const groupRepo = AppDataSource.getRepository(Group);
  const group = groupRepo.create({ congregationId: id, name });
  await groupRepo.save(group);

  return NextResponse.json({ data: group }, { status: 201 });
}
