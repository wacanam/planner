import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { Territory } from '@/entities/Territory';
import { CongregationRole } from '@/entities/CongregationMember';
import { TerritoryStatus } from '@/entities/Territory';

// GET /api/congregations/:id/territories
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const territoryRepo = AppDataSource.getRepository(Territory);
  const territories = await territoryRepo.find({
    where: { congregationId: id },
    relations: ['publisher', 'group'],
  });

  return NextResponse.json({ data: territories });
}

// POST /api/congregations/:id/territories — territory_servant or above
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.TERRITORY_SERVANT);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, number, notes, publisherId, groupId } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (publisherId && groupId) {
    return NextResponse.json(
      { error: 'A territory can only be assigned to a publisher OR a group, not both' },
      { status: 400 }
    );
  }

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const territoryRepo = AppDataSource.getRepository(Territory);
  const territory = territoryRepo.create({
    congregationId: id,
    name,
    number: number ?? name,
    notes,
    publisherId: publisherId ?? undefined,
    groupId: groupId ?? undefined,
    status: publisherId || groupId ? TerritoryStatus.ASSIGNED : TerritoryStatus.AVAILABLE,
  });

  await territoryRepo.save(territory);

  return NextResponse.json({ data: territory }, { status: 201 });
}
