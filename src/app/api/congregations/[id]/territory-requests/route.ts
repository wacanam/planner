import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryRequest, TerritoryRequestStatus } from '@/entities/TerritoryRequest';
import { CongregationRole } from '@/entities/CongregationMember';

// GET /api/congregations/:id/territory-requests — service_overseer or admin sees all; others see own
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;
  const { user, member } = auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const requestRepo = AppDataSource.getRepository(TerritoryRequest);

  const isPrivileged =
    !member || // global admin
    member.congregationRole === CongregationRole.SERVICE_OVERSEER ||
    member.congregationRole === CongregationRole.TERRITORY_SERVANT;

  const where: Record<string, unknown> = { congregationId: id };
  if (!isPrivileged) {
    where.publisherId = user.userId;
  }

  // Default: show pending
  const url = new URL(req.url);
  const status = url.searchParams.get('status') as TerritoryRequestStatus | null;
  if (status) where.status = status;
  else where.status = TerritoryRequestStatus.PENDING;

  const requests = await requestRepo.find({
    where,
    relations: ['publisher', 'approver'],
    order: { requestedAt: 'DESC' },
  });

  return NextResponse.json({ data: requests });
}

// POST /api/congregations/:id/territory-requests — any congregation member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { territoryId } = body;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const requestRepo = AppDataSource.getRepository(TerritoryRequest);
  const request = requestRepo.create({
    congregationId: id,
    publisherId: user.userId,
    territoryId: territoryId ?? undefined,
    status: TerritoryRequestStatus.PENDING,
  });

  await requestRepo.save(request);

  return NextResponse.json({ data: request }, { status: 201 });
}
