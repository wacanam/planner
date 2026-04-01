import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { AppDataSource } from '@/lib/data-source';
import { Congregation } from '@/entities/Congregation';
import { CongregationMember } from '@/entities/CongregationMember';

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
  const memberRepo = AppDataSource.getRepository(CongregationMember);

  // Generate slug
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

  const congregation = congregationRepo.create({
    name,
    slug,
    city,
    country,
    createdById: user.userId,
  });

  await congregationRepo.save(congregation);

  // Auto-add creator as member with service_overseer role
  const member = memberRepo.create({
    userId: user.userId,
    congregationId: congregation.id,
    congregationRole: undefined,
  });
  await memberRepo.save(member);

  return NextResponse.json({ data: congregation }, { status: 201 });
}
