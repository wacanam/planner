import { type NextRequest, NextResponse } from 'next/server';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { Congregation } from '@/entities/Congregation';

// GET /api/congregations/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const congregationRepo = AppDataSource.getRepository(Congregation);
  const congregation = await congregationRepo.findOne({
    where: { id },
    relations: ['createdBy'],
  });

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
  }

  return NextResponse.json({ data: congregation });
}
