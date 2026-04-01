import { type NextRequest, NextResponse } from 'next/server';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { Congregation } from '@/entities/Congregation';
import { UserRole } from '@/entities/User';

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

// PATCH /api/congregations/:id — admin or super admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = withAuth(req, UserRole.ADMIN);
  if (auth instanceof NextResponse) return auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const congregationRepo = AppDataSource.getRepository(Congregation);
  const congregation = await congregationRepo.findOne({ where: { id } });

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
  }

  const body = await req.json();
  const { name, city, country, status } = body;

  if (name) congregation.name = name;
  if (city !== undefined) congregation.city = city;
  if (country !== undefined) congregation.country = country;
  if (status) congregation.status = status;

  await congregationRepo.save(congregation);

  return NextResponse.json({ data: congregation });
}

// DELETE /api/congregations/:id — super admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = withAuth(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const congregationRepo = AppDataSource.getRepository(Congregation);
  const congregation = await congregationRepo.findOne({ where: { id } });

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
  }

  await congregationRepo.remove(congregation);

  return NextResponse.json({ success: true });
}
