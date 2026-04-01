import { type NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { db, congregations, congregationMembers, UserRole } from '@/db';

// GET /api/congregations
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    const rows = await db.select().from(congregations).orderBy(desc(congregations.createdAt));
    return NextResponse.json({ data: rows });
  }

  if (user.congregationId) {
    const [congregation] = await db
      .select()
      .from(congregations)
      .where(eq(congregations.id, user.congregationId))
      .limit(1);
    return NextResponse.json({ data: congregation ? [congregation] : [] });
  }

  return NextResponse.json({ data: [] });
}

// POST /api/congregations
export async function POST(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { name, city, country } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;

  const [congregation] = await db
    .insert(congregations)
    .values({ name, slug, city, country, createdById: user.userId })
    .returning();

  await db.insert(congregationMembers).values({
    userId: user.userId,
    congregationId: congregation.id,
  });

  return NextResponse.json({ data: congregation }, { status: 201 });
}
