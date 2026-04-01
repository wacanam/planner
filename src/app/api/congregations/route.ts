import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { Congregation } from '@/entities/Congregation';
import { UserRole } from '@/entities/User';

// GET /api/congregations — super admin gets all, others get their own
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const congregationRepo = AppDataSource.getRepository(Congregation);

  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    const congregations = await congregationRepo.find({
      order: { createdAt: 'DESC' },
    });
    console.log({ congregations });
    return NextResponse.json({ data: congregations });
  }

  // Other roles: return their congregation only
  if (user.congregationId) {
    const congregation = await congregationRepo.findOne({
      where: { id: user.congregationId },
    });
    return NextResponse.json({ data: congregation ? [congregation] : [] });
  }

  return NextResponse.json({ data: [] });
}

// POST /api/congregations — any authenticated user can create
export async function POST(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { name, city, country } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const congregationRepo = AppDataSource.getRepository(Congregation);
  const { CongregationMember } = await import('@/entities/CongregationMember');
  const memberRepo = AppDataSource.getRepository(CongregationMember);

  const slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
  const congregation = congregationRepo.create({
    name,
    slug,
    city,
    country,
    createdById: user.userId,
  });

  await congregationRepo.save(congregation);

  // Auto-add creator as member
  const member = memberRepo.create({
    userId: user.userId,
    congregationId: congregation.id,
  });
  await memberRepo.save(member);

  return NextResponse.json({ data: congregation }, { status: 201 });
}
