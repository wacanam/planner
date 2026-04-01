import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { TerritoryRequest, TerritoryRequestStatus } from '@/entities/TerritoryRequest';
import { CongregationRole } from '@/entities/CongregationMember';

// PATCH /api/congregations/:id/territory-requests/:requestId — approve/reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id, requestId } = await params;

  // Requires territory_servant or service_overseer
  const auth = await withCongregationAuth(req, id, CongregationRole.TERRITORY_SERVANT);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { status } = body;

  if (![TerritoryRequestStatus.APPROVED, TerritoryRequestStatus.REJECTED].includes(status)) {
    return NextResponse.json(
      { error: 'status must be approved or rejected' },
      { status: 400 }
    );
  }

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const requestRepo = AppDataSource.getRepository(TerritoryRequest);
  const request = await requestRepo.findOne({
    where: { id: requestId, congregationId: id },
  });

  if (!request) {
    return NextResponse.json({ error: 'Territory request not found' }, { status: 404 });
  }

  if (request.status !== TerritoryRequestStatus.PENDING) {
    return NextResponse.json({ error: 'Request has already been processed' }, { status: 409 });
  }

  request.status = status;
  request.approvedBy = user.userId;
  request.approvedAt = new Date();

  await requestRepo.save(request);

  return NextResponse.json({ data: request });
}
